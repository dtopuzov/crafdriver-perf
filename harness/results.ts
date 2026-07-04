import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvInfo } from './env.ts';
import type { Stats } from './stats.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS_DIR = path.join(__dirname, '..', 'results');

export type Library =
  | 'craftdriver'
  | 'craftdriver-optimized'
  | 'craftdriver-zero-config'
  | 'selenium-webdriver'
  | 'webdriverio'
  | 'playwright'
  | 'kendo-e2e';

export interface ScenarioResult {
  scenario: string;
  samples: number[];
  stats: Stats;
}

export interface RunResult {
  library: Library;
  libraryVersion: string | null;
  /** craftdriver's own git SHA — always recorded, even for competitor runs,
   * so a comparison result is pinned to a specific craftdriver revision. */
  craftdriverSha: string | null;
  env: EnvInfo;
  scenarios: ScenarioResult[];
}

export function writeResult(result: RunResult): string {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = result.env.timestamp.replace(/[:.]/g, '-');
  const file = path.join(RESULTS_DIR, `${result.library}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));
  return file;
}
