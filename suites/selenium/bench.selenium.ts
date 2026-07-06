/**
 * selenium-webdriver competitive benchmark suite. Scenarios mirror
 * ../craftdriver and ../wdio exactly — see ../../README.md for fairness rules.
 */
import { afterAll, describe, it, expect } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
} from '../../harness/config.ts';
import { sample, summarize, timed, fmt, settle } from '../../harness/stats.ts';
import { captureEnv, craftdriverGitSha, packageVersion, resolvePackageDir } from '../../harness/env.ts';
import { writeResult, type ScenarioResult } from '../../harness/results.ts';
import { CRAFTDRIVER_REPO } from '../../harness/config.ts';

const { Builder, By, Key, until } = pkg;
const { Options: ChromeOptions, ServiceBuilder } = chromePkg;

const results: ScenarioResult[] = [];

function record(scenario: string, samples: number[]) {
  results.push({ scenario, samples, stats: summarize(samples) });
  console.log(`  ${scenario}: median=${fmt(summarize(samples).median)} p95=${fmt(summarize(samples).p95)} n=${samples.length}`);
}

async function launch() {
  const options = new ChromeOptions();
  if (HEADLESS) options.addArguments('--headless=new');
  options.addArguments(WINDOW_SIZE_ARG);
  const service = new ServiceBuilder(CHROMEDRIVER_PATH!);
  return new Builder().forBrowser('chrome').setChromeOptions(options).setChromeService(service).build();
}

describe('selenium-webdriver competitive benchmark', () => {
  afterAll(() => {
    const dir = resolvePackageDir('selenium-webdriver', import.meta.url);
    const file = writeResult({
      library: 'selenium-webdriver',
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
        const [elapsed, driver] = await timed(() => launch());
        await driver.quit();
        return elapsed;
      },
      WARMUP_ITERATIONS,
      STARTUP_ITERATIONS
    );
    record('startup', samples);
    expect(samples.length).toBe(STARTUP_ITERATIONS);
  }, 300_000);

  it('2. navigate (isolated)', async () => {
    const driver = await launch();
    try {
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(() => driver.get(`${BASE_URL}/navigate-a.html`));
          await driver.get(`${BASE_URL}/navigate-b.html`); // untimed cache-bust between samples
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('navigate', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('3. locate elements x10 (complex DOM, 5000 nodes)', async () => {
    const driver = await launch();
    try {
      await driver.get(`${BASE_URL}/complex-dom.html`);
      await settle();
      const selectors = Array.from({ length: 10 }, (_, i) => `#deep-target-${i}`);
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            for (const sel of selectors) await driver.findElement(By.css(sel)).getText();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('locate x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('4. click x10', async () => {
    const driver = await launch();
    try {
      const samples = await sample(
        async () => {
          await driver.get(`${BASE_URL}/click-targets.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            for (let i = 0; i < 10; i++) await driver.findElement(By.css(`#btn-${i}`)).click();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('click x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('5. keyboard: type + tab + type + enter', async () => {
    const driver = await launch();
    try {
      const samples = await sample(
        async () => {
          await driver.get(`${BASE_URL}/keyboard.html`); // untimed reset
          await driver.findElement(By.css('#editor')).click();
          const [elapsed] = await timed(async () => {
            // Actions API sends keys to the focused element directly — no
            // `switchTo().activeElement()` round trips (which the other libs
            // don't do), so this measures the same 4 keyboard ops they do.
            await driver.actions().sendKeys('the quick brown fox jumps over the lazy dog').perform();
            await driver.actions().sendKeys(Key.TAB).perform();
            await driver.actions().sendKeys('submit-value').perform();
            await driver.actions().sendKeys(Key.ENTER).perform();
          });
          // Integrity check (untimed): proves Tab moved focus to #enterTarget
          // and Enter fired there — so we never measure a silent no-op.
          expect(await driver.findElement(By.css('#enterResult')).getText()).toBe('submitted');
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('keyboard: type+tab+type+enter', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('6. combo: navigate + fill + click + wait-visible + screenshot', async () => {
    const driver = await launch();
    try {
      await settle();
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await driver.get(`${BASE_URL}/login.html`);
            // clear() first so the measured work matches the clear-then-type
            // the fill idioms do (craftdriver fill, kendo type, wdio setValue
            // all clear before typing). Locate once, then clear + sendKeys on
            // the same element, mirroring craftdriver's fill.
            const usernameEl = await driver.findElement(By.css('#username'));
            await usernameEl.clear();
            await usernameEl.sendKeys('perfuser');
            const passwordEl = await driver.findElement(By.css('#password'));
            await passwordEl.clear();
            await passwordEl.sendKeys('secret');
            await driver.findElement(By.css('#submit')).click();
            // #welcome doesn't exist in the DOM until it's injected, so wait
            // for it to appear before checking visibility (elementIsVisible
            // needs an already-resolved element).
            const welcome = await driver.wait(until.elementLocated(By.css('#welcome')));
            await driver.wait(until.elementIsVisible(welcome));
            await driver.takeScreenshot();
          });
          await driver.manage().deleteAllCookies(); // untimed cleanup for next sample
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('combo: nav+fill+click+wait-visible+screenshot', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('7. wait for visible element (delayed reveal)', async () => {
    const driver = await launch();
    try {
      const samples = await sample(
        async () => {
          await driver.get(`${BASE_URL}/delayed-reveal.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            await driver.findElement(By.css('#reveal-btn')).click();
            await driver.wait(until.elementIsVisible(driver.findElement(By.css('#revealed'))));
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('wait for visible (delayed reveal)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('8. heavy network app: navigate + wait-visible', async () => {
    const driver = await launch();
    try {
      let run = 0;
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await driver.get(`${BASE_URL}/heavy-network.html?run=selenium-${run++}`);
            const ready = await driver.wait(until.elementLocated(By.css('#network-ready')));
            await driver.wait(until.elementIsVisible(ready));
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('heavy network: navigate+wait-visible', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await driver.quit();
    }
  }, 180_000);

  it('9. screenshot to disk (viewport)', async () => {
    const driver = await launch();
    try {
      await driver.get(`${BASE_URL}/selectors.html`);
      await settle();
      // selenium-webdriver has no built-in "save to path" screenshot helper —
      // this is the idiomatic manual capture + write a selenium user would do.
      const screenshotPath = path.join(tmpdir(), 'craftdriver-perf-screenshot-selenium.png');
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            const b64 = await driver.takeScreenshot();
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
      await driver.quit();
    }
  }, 180_000);
});
