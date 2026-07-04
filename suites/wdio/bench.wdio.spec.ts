/**
 * webdriverio competitive benchmark suite, run under wdio's own default test
 * runner (@wdio/cli + local-runner + mocha), so the numbers reflect what a
 * wdio user actually experiences.
 * Scenarios mirror ../craftdriver and ../selenium exactly; see
 * ../../README.md for fairness rules.
 *
 * "Startup" is the one scenario that can't use the runner-owned browser:
 * `browser.reloadSession()` recycles the runner's driver process and can leave
 * the rest of the spec with an invalid session when ChromeDriver hangs. For
 * this scenario only, create an isolated wdio `remote()` session with the same
 * capabilities and close it immediately after timing.
 */
import { tmpdir } from 'node:os';
import path from 'node:path';
import { browser, $ } from '@wdio/globals';
import { Key, remote } from 'webdriverio';
import { BASE_URL, WARMUP_ITERATIONS, MEASURED_ITERATIONS, STARTUP_ITERATIONS } from '../../harness/config.ts';
import { sample, summarize, timed, fmt, settle } from '../../harness/stats.ts';
import { captureEnv, craftdriverGitSha, packageVersion, resolvePackageDir } from '../../harness/env.ts';
import { writeResult, type ScenarioResult } from '../../harness/results.ts';
import { CHROMEDRIVER_PATH, CRAFTDRIVER_REPO } from '../../harness/config.ts';
import { createWdioManagedChromeCapabilities } from './capabilities.ts';
import { transformRequest } from './wdio-compat.ts';

const results: ScenarioResult[] = [];

function record(scenario: string, samples: number[]) {
  results.push({ scenario, samples, stats: summarize(samples) });
  console.log(`  ${scenario}: median=${fmt(summarize(samples).median)} p95=${fmt(summarize(samples).p95)} n=${samples.length}`);
}

async function launchStartupBrowser() {
  const skipDriverSetup = process.env.WDIO_SKIP_DRIVER_SETUP;
  delete process.env.WDIO_SKIP_DRIVER_SETUP;

  try {
    return await remote({
      logLevel: 'warn',
      capabilities: createWdioManagedChromeCapabilities(),
      baseUrl: BASE_URL,
      waitforTimeout: 10000,
      connectionRetryTimeout: 120000,
      connectionRetryCount: 3,
      transformRequest,
    });
  } finally {
    if (skipDriverSetup === undefined) {
      delete process.env.WDIO_SKIP_DRIVER_SETUP;
    } else {
      process.env.WDIO_SKIP_DRIVER_SETUP = skipDriverSetup;
    }
  }
}

describe('webdriverio competitive benchmark', () => {
  after(() => {
    const dir = resolvePackageDir('webdriverio', import.meta.url);
    const file = writeResult({
      library: 'webdriverio',
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
        const [elapsed, startupBrowser] = await timed(() => launchStartupBrowser());
        try {
          return elapsed;
        } finally {
          await startupBrowser.deleteSession();
        }
      },
      WARMUP_ITERATIONS,
      STARTUP_ITERATIONS
    );
    record('startup', samples);
    expect(samples.length).toBe(STARTUP_ITERATIONS);
  });

  it('2. navigate (isolated)', async () => {
    const samples = await sample(
      async () => {
        const [elapsed] = await timed(() => browser.url(`${BASE_URL}/navigate-a.html`));
        await browser.url(`${BASE_URL}/navigate-b.html`); // untimed cache-bust between samples
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('navigate', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('3. locate elements x10 (complex DOM, 5000 nodes)', async () => {
    await browser.url(`${BASE_URL}/complex-dom.html`);
    await settle();
    const selectors = Array.from({ length: 10 }, (_, i) => `#deep-target-${i}`);
    const samples = await sample(
      async () => {
        const [elapsed] = await timed(async () => {
          for (const sel of selectors) await $(sel).getText();
        });
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('locate x10', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('4. click x10', async () => {
    const samples = await sample(
      async () => {
        await browser.url(`${BASE_URL}/click-targets.html`); // untimed reset
        await settle();
        const [elapsed] = await timed(async () => {
          for (let i = 0; i < 10; i++) await $(`#btn-${i}`).click();
        });
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('click x10', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('5. keyboard: type + tab + type + enter', async () => {
    const samples = await sample(
      async () => {
        await browser.url(`${BASE_URL}/keyboard.html`); // untimed reset
        await $('#editor').click();
        const [elapsed] = await timed(async () => {
          await browser.keys('the quick brown fox jumps over the lazy dog');
          await browser.keys(Key.Tab);
          await browser.keys('submit-value');
          await browser.keys(Key.Enter);
        });
        // Integrity check (untimed): proves Tab moved focus to #enterTarget
        // and Enter fired there — so we never measure a silent no-op.
        expect(await $('#enterResult').getText()).toBe('submitted');
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('keyboard: type+tab+type+enter', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('6. combo: navigate + fill + click + wait-visible + screenshot', async () => {
    await settle();
    const samples = await sample(
      async () => {
        const [elapsed] = await timed(async () => {
          await browser.url(`${BASE_URL}/login.html`);
          await $('#username').setValue('perfuser');
          await $('#password').setValue('secret');
          await $('#submit').click();
          await $('#welcome').waitForDisplayed();
          await browser.takeScreenshot();
        });
        await browser.deleteCookies(); // untimed cleanup for next sample
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('combo: nav+fill+click+wait-visible+screenshot', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('7. wait for visible element (delayed reveal)', async () => {
    const samples = await sample(
      async () => {
        await browser.url(`${BASE_URL}/delayed-reveal.html`); // untimed reset
        await settle();
        const [elapsed] = await timed(async () => {
          await $('#reveal-btn').click();
          await $('#revealed').waitForDisplayed();
        });
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('wait for visible (delayed reveal)', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('8. heavy network app: navigate + wait-visible', async () => {
    let run = 0;
    const samples = await sample(
      async () => {
        const [elapsed] = await timed(async () => {
          await browser.url(`${BASE_URL}/heavy-network.html?run=wdio-${run++}`);
          await $('#network-ready').waitForDisplayed();
        });
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('heavy network: navigate+wait-visible', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });

  it('9. screenshot to disk (viewport)', async () => {
    await browser.url(`${BASE_URL}/selectors.html`);
    await settle();
    const screenshotPath = path.join(tmpdir(), 'craftdriver-perf-screenshot-wdio.png');
    const samples = await sample(
      async () => {
        const [elapsed] = await timed(() => browser.saveScreenshot(screenshotPath));
        return elapsed;
      },
      WARMUP_ITERATIONS,
      MEASURED_ITERATIONS
    );
    record('screenshot to disk (viewport)', samples);
    expect(samples.length).toBe(MEASURED_ITERATIONS);
  });
});
