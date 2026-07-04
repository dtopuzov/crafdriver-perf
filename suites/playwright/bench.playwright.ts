/**
 * playwright competitive benchmark suite. Scenarios mirror ../craftdriver,
 * ../selenium, and ../wdio exactly (same fixtures, same iteration counts) —
 * see ../../README.md for the fairness rules this suite must not violate.
 *
 * Playwright does not use WebDriver/chromedriver at all — it drives Chrome
 * directly over CDP. Rather than its own bundled Chromium, this suite
 * launches via `executablePath: CHROME_BINARY_PATH` pointed at the real
 * system Chrome in /Applications — the same Chrome build the other three
 * suites drive via chromedriver. This is as close to apples-to-apples as
 * Playwright's architecture allows; it still isn't going through
 * chromedriver/WebDriver, just the same Chrome binary.
 */
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import {
  BASE_URL,
  HEADLESS,
  CHROME_BINARY_PATH,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
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

interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

async function launch(): Promise<Session> {
  const browser = await chromium.launch({ headless: HEADLESS, executablePath: CHROME_BINARY_PATH });
  const context = await browser.newContext({ viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } });
  const page = await context.newPage();
  return { browser, context, page };
}

async function close(session: Session) {
  await session.browser.close();
}

describe('playwright competitive benchmark', () => {
  afterAll(() => {
    const dir = resolvePackageDir('playwright', import.meta.url);
    const file = writeResult({
      library: 'playwright',
      libraryVersion: dir ? packageVersion(dir) : null,
      craftdriverSha: craftdriverGitSha(CRAFTDRIVER_REPO),
      env: captureEnv(null), // playwright doesn't use chromedriver
      scenarios: results,
    });
    console.log(`\nWrote ${file}`);
  });

  it('1. browser startup (isolated)', async () => {
    const samples = await sample(
      async () => {
        const [elapsed, session] = await timed(() => launch());
        await close(session);
        return elapsed;
      },
      WARMUP_ITERATIONS,
      STARTUP_ITERATIONS
    );
    record('startup', samples);
    expect(samples.length).toBe(STARTUP_ITERATIONS);
  }, 600_000);

  it('2. navigate (isolated)', async () => {
    const session = await launch();
    try {
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(() => session.page.goto(`${BASE_URL}/navigate-a.html`));
          await session.page.goto(`${BASE_URL}/navigate-b.html`); // untimed cache-bust between samples
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('navigate', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('3. locate elements x10 (complex DOM, 5000 nodes)', async () => {
    const session = await launch();
    try {
      await session.page.goto(`${BASE_URL}/complex-dom.html`);
      await settle();
      const selectors = Array.from({ length: 10 }, (_, i) => `#deep-target-${i}`);
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            for (const sel of selectors) await session.page.locator(sel).innerText();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('locate x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('4. click x10', async () => {
    const session = await launch();
    try {
      const samples = await sample(
        async () => {
          await session.page.goto(`${BASE_URL}/click-targets.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            for (let i = 0; i < 10; i++) await session.page.locator(`#btn-${i}`).click();
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('click x10', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('5. keyboard: type + tab + type + enter', async () => {
    const session = await launch();
    try {
      const samples = await sample(
        async () => {
          await session.page.goto(`${BASE_URL}/keyboard.html`); // untimed reset
          await session.page.locator('#editor').click();
          const [elapsed] = await timed(async () => {
            await session.page.keyboard.type('the quick brown fox jumps over the lazy dog');
            await session.page.keyboard.press('Tab');
            await session.page.keyboard.type('submit-value');
            await session.page.keyboard.press('Enter');
          });
          // Integrity check (untimed): proves Tab moved focus to #enterTarget
          // and Enter fired there — so we never measure a silent no-op.
          expect(await session.page.locator('#enterResult').innerText()).toBe('submitted');
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('keyboard: type+tab+type+enter', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('6. combo: navigate + fill + click + wait-visible + screenshot', async () => {
    const session = await launch();
    try {
      await settle();
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await session.page.goto(`${BASE_URL}/login.html`);
            // pressSequentially (real per-char key events), not fill() — fill
            // is a DOM value-set that skips keydown/keyup, unlike the other
            // libraries' fill idioms (sendKeys/setValue/type), so it wouldn't
            // be measuring the same work.
            await session.page.locator('#username').pressSequentially('perfuser');
            await session.page.locator('#password').pressSequentially('secret');
            await session.page.locator('#submit').click();
            await session.page.locator('#welcome').waitFor({ state: 'visible' });
            await session.page.screenshot();
          });
          await session.context.clearCookies(); // untimed cleanup for next sample
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('combo: nav+fill+click+wait-visible+screenshot', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('7. wait for visible element (delayed reveal)', async () => {
    const session = await launch();
    try {
      const samples = await sample(
        async () => {
          await session.page.goto(`${BASE_URL}/delayed-reveal.html`); // untimed reset
          await settle();
          const [elapsed] = await timed(async () => {
            await session.page.locator('#reveal-btn').click();
            await session.page.locator('#revealed').waitFor({ state: 'visible' });
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('wait for visible (delayed reveal)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('8. heavy network app: navigate + wait-visible', async () => {
    const session = await launch();
    try {
      let run = 0;
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(async () => {
            await session.page.goto(`${BASE_URL}/heavy-network.html?run=playwright-${run++}`);
            await session.page.locator('#network-ready').waitFor({ state: 'visible' });
          });
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('heavy network: navigate+wait-visible', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);

  it('9. screenshot to disk (viewport)', async () => {
    const session = await launch();
    try {
      await session.page.goto(`${BASE_URL}/selectors.html`);
      await settle();
      const screenshotPath = path.join(tmpdir(), 'craftdriver-perf-screenshot-playwright.png');
      const samples = await sample(
        async () => {
          const [elapsed] = await timed(() => session.page.screenshot({ path: screenshotPath }));
          return elapsed;
        },
        WARMUP_ITERATIONS,
        MEASURED_ITERATIONS
      );
      record('screenshot to disk (viewport)', samples);
      expect(samples.length).toBe(MEASURED_ITERATIONS);
    } finally {
      await close(session);
    }
  }, 180_000);
});
