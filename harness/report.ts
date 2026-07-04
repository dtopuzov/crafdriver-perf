/**
 * Renders a comparison table (scenario x library) from the latest results
 * JSON per library in results/. Run with: `node harness/report.ts`
 * (Node 22+ runs this file directly — no build step needed.)
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RunResult, Library } from './results.ts';
import { fmt } from './stats.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');

function latestResultPerLibrary(): Partial<Record<Library, RunResult>> {
  const files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
  const latest: Partial<Record<Library, { file: string; result: RunResult }>> = {};
  for (const file of files) {
    const result = JSON.parse(readFileSync(path.join(RESULTS_DIR, file), 'utf-8')) as RunResult;
    const current = latest[result.library];
    if (!current || result.env.timestamp > current.result.env.timestamp) {
      latest[result.library] = { file, result };
    }
  }
  const out: Partial<Record<Library, RunResult>> = {};
  for (const lib of Object.keys(latest) as Library[]) out[lib] = latest[lib]!.result;
  return out;
}

function main() {
  const latest = latestResultPerLibrary();
  const libs = Object.keys(latest) as Library[];
  if (libs.length === 0) {
    console.log('No results found in results/. Run a suite first.');
    return;
  }

  console.log('Environment (per run):');
  for (const lib of libs) {
    const r = latest[lib]!;
    console.log(
      `  ${lib.padEnd(20)} v${r.libraryVersion ?? '?'}  craftdriver@${r.craftdriverSha ?? '?'}  ` +
        `${r.env.platform} ${r.env.arch}  chrome ${r.env.chromeVersion ?? '?'}  ${r.env.timestamp}`
    );
  }

  const scenarioNames = new Set<string>();
  for (const lib of libs) for (const s of latest[lib]!.scenarios) scenarioNames.add(s.scenario);

  console.log('\nMedian / p95 (ms) — ratio vs craftdriver in parentheses\n');
  const header = ['scenario', ...libs].map((h) => h.padEnd(26)).join(' | ');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const scenario of scenarioNames) {
    const cells = [scenario.padEnd(26)];
    const craftdriverStats = latest['craftdriver']?.scenarios.find((s) => s.scenario === scenario)?.stats;
    for (const lib of libs) {
      const stats = latest[lib]!.scenarios.find((s) => s.scenario === scenario)?.stats;
      if (!stats) {
        cells.push('n/a'.padEnd(26));
        continue;
      }
      const ratio = craftdriverStats && lib !== 'craftdriver' ? ` (${(stats.median / craftdriverStats.median).toFixed(2)}x)` : '';
      cells.push(`${fmt(stats.median)}/${fmt(stats.p95)}${ratio}`.padEnd(26));
    }
    console.log(cells.join(' | '));
  }
}

main();
