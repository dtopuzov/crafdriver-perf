import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.join(__dirname, '..');
export const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures');
export const CRAFTDRIVER_REPO = path.join(REPO_ROOT, '..', 'craftdriver');

export const BASE_URL = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:8081';
export const HEADLESS = process.env.HEADLESS !== 'false';

/**
 * Same viewport for all three suites, set via the browser's own `--window-size`
 * command-line flag (not a post-launch resize call) so it's part of the launch
 * capabilities every library gets identically — see README "Fairness rules".
 */
export const VIEWPORT_WIDTH = Number(process.env.PERF_VIEWPORT_WIDTH ?? 1280);
export const VIEWPORT_HEIGHT = Number(process.env.PERF_VIEWPORT_HEIGHT ?? 800);
export const WINDOW_SIZE_ARG = `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`;

/**
 * System Chrome binary used by the `playwright-pinned-chrome` suite, so one
 * Playwright column launches the *same* Chrome build the other three drive
 * via chromedriver (as close to apples-to-apples as Playwright's CDP-based
 * architecture allows) instead of its own bundled Chromium. macOS default;
 * override via env on other platforms.
 */
export const CHROME_BINARY_PATH =
  process.env.PERF_CHROME_BINARY ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * Pinned chromedriver binary — every suite must point at exactly this file so
 * a comparison is never confounded by different driver versions/builds. Set
 * once (see README "Setup") to the same cache path craftdriver's own driver
 * manager resolves, so `npm run bench` in craftdriver and this repo use the
 * identical binary.
 */
export const CHROMEDRIVER_PATH = process.env.CHROMEDRIVER_PATH;
if (!CHROMEDRIVER_PATH) {
  throw new Error(
    'CHROMEDRIVER_PATH is not set. Every suite must pin the same chromedriver binary — ' +
      'see README "Setup". Example: export CHROMEDRIVER_PATH=~/.cache/craftdriver/chromedriver/<ver>/mac-x64/chromedriver'
  );
}

export const WARMUP_ITERATIONS = Number(process.env.PERF_WARMUP ?? 2);
export const MEASURED_ITERATIONS = Number(process.env.PERF_ITERATIONS ?? 20);
export const STARTUP_ITERATIONS = Number(process.env.PERF_STARTUP_ITERATIONS ?? 10);
