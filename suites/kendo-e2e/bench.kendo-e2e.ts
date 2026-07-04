/**
 * @progress/kendo-e2e competitive benchmark suite. Scenarios mirror
 * ../craftdriver, ../selenium, ../wdio, and ../playwright exactly (same
 * fixtures, same iteration counts) — see ../../README.md for fairness rules.
 *
 * kendo-e2e is a Selenium-webdriver wrapper (auto-waiting find/click/type +
 * a Playwright-style expect API) — it has no chromedriver-pinning option of
 * its own (`BrowserOptions` takes `driver`, `mobileEmulation`, `enableBidi`,
 * `chromeArguments`, but no binary path). Its `Browser` constructor accepts
 * an already-built `ThenableWebDriver` directly (used as-is, bypassing its
 * own driver manager entirely — verified in dist/selenium/browser.js), so
 * this suite builds the driver exactly like ../selenium does (pinned
 * chromedriver, headless, window size) and wraps it: `new Browser(driver)`.
 */
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { afterAll, describe, it, expect } from 'vitest';
import { Browser, Key } from '@progress/kendo-e2e';
import pkg from 'selenium-webdriver';
import chromePkg from 'selenium-webdriver/chrome.js';
import {
  BASE_URL,
  CHROMEDRIVER_PATH,
  HEADLESS,
  WINDOW_SIZE_ARG,
  WARMUP_ITERATIONS,
  MEASURED_ITERATIONS,
  STARTUP_ITERATIONS,
} from '../../harness/config.js';
import { sample, summarize, timed, fmt, settle } from '../../harness/stats.js';
import { captureEnv, craftdriverGitSha, packageVersion, resolvePackageDir } from '../../harness/env.js';
import { writeResult, type ScenarioResult } from '../../harness/results.js';
import { CRAFTDRIVER_REPO } from '../../harness/config.js';

const { Builder } = pkg;
const { Options: ChromeOptions, ServiceBuilder } = chromePkg;

const results: ScenarioResult[] = [];

function record(scenario: string, samples: number[]) {
  results.push({ scenario, samples, stats: summarize(samples) });
  console.log(`  ${scenario}: median=${fmt(summarize(samples).median)} p95=${fmt(summarize(samples).p95)} n=${samples.length}`);
}

async function launch(): Promise<Browser> {
  const options = new ChromeOptions();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments(WINDOW_SIZE_ARG);
  const service = new ServiceBuilder(CHROMEDRIVER_PATH!);
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).setChromeService(service).build();
  return new Browser(driver);
}

describe('kendo-e2e competitive benchmark', () => {
  afterAll(() => {
    const dir = resolvePackageDir('@progress/kendo-e2e', import.meta.url);
    const file = writeResult({
      library: 'kendo-e2e',
      libraryVersion: dir ? packageVersion(dir) : null,
      craftdriverSha: craftdriverGitSha(CRAFTDRIVER_REPO),
      env: captureEnv(CHROMEDRIVER_PATH ?? null),
      scenarios: results,
    });
    console.log(`\nWrote ${file}`);
  });

  it('1. browser startup (isolated)', async () => {
    const samples = await sample(
      async () => {
        const [elapsed, browser] = await timed(() => launch());
        await browser.close();
        return elapsed;
      },
      WARMUP_ITERATIONS,
      STARTUP_ITERATIONS
    );
    record('startup', samples);
    expect(samples.length).toBe(STARTUP_ITERATIONS);
  }, 600_000);

  it('2. navigate (isolated)', async () => {
    const browser = await launch();
    try {
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(() => browser.navigateTo(`${BASE_URL}/navigate-a.html`));
          await browser.navigateTo(`${BASE_URL}/navigate-b.html`); // untimed cache-bust between samples
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('navigate', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('3. locate elements x10 (complex DOM, 5000 nodes)', async () => {
    const browser = await launch();
    try {
      await browser.navigateTo(`${BASE_URL}/complex-dom.html`);
      await settle();
      const selectors = Array.from({ length: 10 }, (_, i) => `#deep-target-${i}`);
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            for (const sel of selectors) await browser.getText(sel);
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('locate x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('4. click x10', async () => {
    const browser = await launch();
    try {
      const samples = await sample(
        async () => {
          await browser.navigateTo(`${BASE_URL}/click-targets.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            for (let i = 0; i < 10; i++) await browser.click(`#btn-${i}`);
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('click x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('5. keyboard: type + tab + type + enter', async () => {
    const browser = await launch();
    try {
      const samples = await sample(
        async () => {
          await browser.navigateTo(`${BASE_URL}/keyboard.html`); // untimed reset
          await browser.click('#editor');
          const [elapsed] = await timed(async () => {
            // { clear: false } — kendo's type() clears the field first by
            // default; the other libs don't clear in this scenario, so disable
            // it to measure the same work. (kendo has no "type into the focused
            // element" primitive, so it must target by selector — the one
            // unavoidable difference here.)
            await browser.type('#editor', 'the quick brown fox jumps over the lazy dog', { clear: false });
            await browser.sendKey(Key.TAB);
            await browser.type('#enterTarget', 'submit-value', { clear: false, sendEnter: true });
          });
          // Integrity check (untimed): proves Tab moved focus to #enterTarget
          // and Enter fired there — so we never measure a silent no-op.
          expect(await browser.getText('#enterResult')).toBe('submitted');
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('keyboard: type+tab+type+enter', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('6. combo: navigate + fill + click + wait-visible + screenshot', async () => {
    const browser = await launch();
    try {
      await settle();
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await browser.navigateTo(`${BASE_URL}/login.html`);
            await browser.type('#username', 'perfuser');
            await browser.type('#password', 'secret');
            await browser.click('#submit');
            await browser.expect('#welcome').toBeVisible();
            await browser.getScreenshot();
          });
          await browser.driver.manage().deleteAllCookies(); // untimed cleanup for next sample
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('combo: nav+fill+click+wait-visible+screenshot', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('7. wait for visible element (delayed reveal)', async () => {
    const browser = await launch();
    try {
      const samples = await sample(
        async () => {
          await browser.navigateTo(`${BASE_URL}/delayed-reveal.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            await browser.click('#reveal-btn');
            await browser.expect('#revealed').toBeVisible();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('wait for visible (delayed reveal)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('8. heavy network app: navigate + wait-visible', async () => {
    const browser = await launch();
    try {
      let run = 0;
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await browser.navigateTo(`${BASE_URL}/heavy-network.html?run=kendo-e2e-${run++}`);
            await browser.expect('#network-ready').toBeVisible();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('heavy network: navigate+wait-visible', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('9. screenshot to disk (viewport)', async () => {
    const browser = await launch();
    try {
      await browser.navigateTo(`${BASE_URL}/selectors.html`);
      await settle();
      // kendo-e2e's getScreenshot() returns base64 only (no built-in save-to-disk
      // helper), same situation as plain selenium-webdriver — manual decode + write.
      const screenshotPath = path.join(tmpdir(), 'craftdriver-perf-screenshot-kendo-e2e.png');
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            const b64 = await browser.getScreenshot();
            await writeFile(screenshotPath, b64, 'base64');
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('screenshot to disk (viewport)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.close();
    }
  }, 180_000);
});
