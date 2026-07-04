/** Shared statistics helpers — every suite reports samples through these so
 * numbers are computed identically regardless of which library produced them. */

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

export function stddev(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function fmt(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

export async function timed<T>(fn: () => Promise<T>): Promise<[number, T]> {
  const start = performance.now();
  const result = await fn();
  return [performance.now() - start, result];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SETTLE_DELAY_MS = 1000;

/** Untimed settle delay — let the page/browser reach a relaxed, fully-loaded
 * state before a timed section starts, so the first measured operation isn't
 * paying for work that's really just-navigated settling cost. Call explicitly
 * at each call site that needs it (not every scenario does — see README
 * "Settle delay"), never from inside `timed()` itself. */
export function settle(): Promise<void> {
  return sleep(SETTLE_DELAY_MS);
}

/** Run `warmup + measured` samples of `fn`, discarding the warmup. */
export async function sample(
  fn: () => Promise<number>,
  warmup: number,
  measured: number
): Promise<number[]> {
  const values: number[] = [];
  for (let i = 0; i < warmup + measured; i++) {
    const elapsed = await fn();
    if (i >= warmup) values.push(elapsed);
  }
  return values;
}

export interface Stats {
  median: number;
  p95: number;
  mean: number;
  stddev: number;
  n: number;
}

export function summarize(values: number[]): Stats {
  return { median: median(values), p95: p95(values), mean: mean(values), stddev: stddev(values), n: values.length };
}
