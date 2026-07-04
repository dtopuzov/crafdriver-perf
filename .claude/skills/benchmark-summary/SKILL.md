---
name: benchmark-summary
description: Regenerate the craftdriver-perf results summary table (results/summary.md) from the JSON files in results/. Use after running any bench:* command in this repo, or whenever asked to update/refresh the results table or comparison table.
---

# Benchmark summary

Run the deterministic generator — do not hand-write or recompute the table:

```sh
node scripts/generate-summary.mjs
```

(equivalently `npm run summary`)

It reads every `results/*.json`, keeps the latest run per `library` (by
`env.timestamp`), and overwrites `results/summary.md` with two tables: run
details (version/n/source file) and scenario × library median/p95 with
ratio-vs-craftdriver. No LLM computation involved — same inputs always
produce the same output, so never manually edit the numbers in
`results/summary.md`; re-run the script instead.

If a library is missing from the table, its JSON isn't in `results/` — run
the corresponding `bench:*` script (see root `package.json` or
`scripts/run-all-benchmarks.sh`) first.
