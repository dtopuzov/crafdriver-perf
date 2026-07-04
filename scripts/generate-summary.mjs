#!/usr/bin/env node
/**
 * Deterministic results-summary generator. Reads every JSON file in results/,
 * picks the latest run per library (by env.timestamp), and writes a
 * markdown table to results/summary.md. No LLM involved — pure data
 * transform, so re-running it always produces the same output for the same
 * JSON inputs.
 *
 * Usage: node scripts/generate-summary.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const OUT_FILE = path.join(RESULTS_DIR, 'summary.md');

const LIB_ORDER = [
  'craftdriver',
  'craftdriver-optimized',
  'selenium-webdriver',
  'kendo-e2e',
  'webdriverio',
  'playwright',
];

function latestPerLibrary() {
  const files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
  const latest = {};
  for (const file of files) {
    const result = JSON.parse(readFileSync(path.join(RESULTS_DIR, file), 'utf-8'));
    const current = latest[result.library];
    if (!current || result.env.timestamp > current.result.env.timestamp) {
      latest[result.library] = { file, result };
    }
  }
  return latest;
}

function fmt(ms) {
  return ms.toFixed(1);
}

function main() {
  const latest = latestPerLibrary();
  const libs = [
    ...LIB_ORDER.filter((l) => latest[l]),
    ...Object.keys(latest).filter((l) => !LIB_ORDER.includes(l)),
  ];

  if (libs.length === 0) {
    console.log(`No result JSON files found in ${RESULTS_DIR}.`);
    return;
  }

  const scenarioNames = [];
  const seen = new Set();
  for (const lib of libs) {
    for (const s of latest[lib].result.scenarios) {
      if (!seen.has(s.scenario)) {
        seen.add(s.scenario);
        scenarioNames.push(s.scenario);
      }
    }
  }

  let md = '';
  md += '# Benchmark results (latest run per library)\n\n';
  md += '## Run details\n\n';
  md += '| library | version | n (startup / other) | file |\n';
  md += '|---|---|---|---|\n';
  for (const lib of libs) {
    const r = latest[lib].result;
    const startupN = r.scenarios.find((s) => s.scenario === 'startup')?.stats.n ?? '-';
    const otherN = r.scenarios.find((s) => s.scenario === 'navigate')?.stats.n ?? '-';
    md += `| ${lib} | ${r.libraryVersion ?? '?'} | ${startupN} / ${otherN} | ${latest[lib].file} |\n`;
  }
  md += '\n';

  const envRef = latest[libs[0]].result.env;
  md += '| | |\n|---|---|\n';
  md += `| Date | ${envRef.timestamp.slice(0, 10)} |\n`;
  md += `| Host | ${envRef.cpuModel}, ${envRef.cpuCount} cores, ${envRef.totalMemGB}GB RAM, ${envRef.platform} |\n`;
  md += `| Node | ${envRef.nodeVersion} |\n`;
  md += `| Chrome (chromedriver-driven) | ${envRef.chromeVersion} |\n`;
  md += `| craftdriver SHA | ${latest[libs[0]].result.craftdriverSha} |\n`;
  md += '\n';

  md += '## Results (mean / p95 ms — ratio vs craftdriver mean in parentheses)\n\n';
  md += '| scenario | ' + libs.join(' | ') + ' |\n';
  md += '|---|' + libs.map(() => '---').join('|') + '|\n';

  for (const scenario of scenarioNames) {
    const craftdriverStats = latest['craftdriver']?.result.scenarios.find((s) => s.scenario === scenario)?.stats;
    const cells = [scenario];
    for (const lib of libs) {
      const stats = latest[lib].result.scenarios.find((s) => s.scenario === scenario)?.stats;
      if (!stats) {
        cells.push('n/a');
        continue;
      }
      const ratio = craftdriverStats && lib !== 'craftdriver' ? ` (${(stats.mean / craftdriverStats.mean).toFixed(2)}x)` : '';
      cells.push(`${fmt(stats.mean)} / ${fmt(stats.p95)}${ratio}`);
    }
    md += '| ' + cells.join(' | ') + ' |\n';
  }

  writeFileSync(OUT_FILE, md);
  console.log(`Wrote ${OUT_FILE}`);
}

main();
