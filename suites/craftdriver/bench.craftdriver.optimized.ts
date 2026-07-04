/**
 * craftdriver "optimized" benchmark — same scenarios as bench.craftdriver.ts,
 * same fixtures, same iteration counts, but with craftdriver's opt-in
 * power-user knobs turned on instead of the library defaults:
 *
 *   - enableBiDi: false — Classic-only, skips the BiDi WebSocket handshake
 *     and routes every command through Classic WebDriver.
 *   - chromedriver pinned via the CHROMEDRIVER_PATH env var (craftdriver's
 *     legacy-compatible auto-detection, see docs/driver-configuration.md)
 *     instead of constructing a ChromeService — no extra object, no explicit
 *     resolution step.
 *
 * This is not "the default experience" — see bench.craftdriver.ts for that —
 * it's the ceiling a craftdriver user gets to if they opt into every
 * documented speed knob. Reported as a separate `craftdriver-optimized`
 * column so the two are never conflated. See ../../README.md for the
 * fairness rules this suite must not violate.
 */
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import { Browser, Key } from 'craftdriver';
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

const results: ScenarioResult[] = [];

function record(scenario: string, samples: number[]) {
  results.push({ scenario, samples, stats: summarize(samples) });
  console.log(`  ${scenario}: median=${fmt(summarize(samples).median)} p95=${fmt(summarize(samples).p95)} n=${samples.length}`);
}

async function launch(): Promise<Browser> {
  // No chromeService — CHROMEDRIVER_PATH (required by harness/config.ts) is
  // picked up directly via craftdriver's legacy env-var fallback.
  return Browser.launch({
    enableBiDi: false,
    args: [...(HEADLESS ? ['--headless=new'] : []), WINDOW_SIZE_ARG],
  });
}

describe('craftdriver optimized benchmark', () => {
  afterAll(() => {
    const craftdriverDir = resolvePackageDir('craftdriver', import.meta.url);
    const file = writeResult({
      library: 'craftdriver-optimized',
      libraryVersion: craftdriverDir ? packageVersion(craftdriverDir) : null,
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
        await browser.quit();
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
      await browser.quit();
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
            for (const sel of selectors) await browser.find(sel).text();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('locate x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
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
      await browser.quit();
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
            await browser.keyboard.type('the quick brown fox jumps over the lazy dog');
            await browser.keyboard.press(Key.Tab);
            await browser.keyboard.type('submit-value');
            await browser.keyboard.press(Key.Enter);
          });
          // Integrity check (untimed): proves Tab moved focus to #enterTarget
          // and Enter fired there — so we never measure a silent no-op.
          expect(await browser.find('#enterResult').text()).toBe('submitted');
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('keyboard: type+tab+type+enter', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
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
            await browser.fill('#username', 'perfuser');
            await browser.fill('#password', 'secret');
            await browser.click('#submit');
            await browser.find('#welcome').expect().toBeVisible();
            await browser.screenshot();
          });
          await browser.storage.clearCookies(); // untimed cleanup for next sample
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('combo: nav+fill+click+wait-visible+screenshot', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
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
            await browser.find('#revealed').expect().toBeVisible();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('wait for visible (delayed reveal)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
    }
  }, 180_000);

  it('8. heavy network app: navigate + wait-visible', async () => {
    const browser = await launch();
    try {
      let run = 0;
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await browser.navigateTo(`${BASE_URL}/heavy-network.html?run=craftdriver-optimized-${run++}`);
            await browser.find('#network-ready').expect().toBeVisible();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('heavy network: navigate+wait-visible', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
    }
  }, 180_000);

  it('9. screenshot to disk (viewport)', async () => {
    const browser = await launch();
    try {
      await browser.navigateTo(`${BASE_URL}/selectors.html`);
      await settle();
      const screenshotPath = path.join(tmpdir(), 'craftdriver-perf-screenshot-craftdriver-optimized.png');
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(() => browser.screenshot({ path: screenshotPath }));
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('screenshot to disk (viewport)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await browser.quit();
    }
  }, 180_000);
});
