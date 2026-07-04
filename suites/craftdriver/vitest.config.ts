import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['bench.craftdriver.ts'],
    // bench.craftdriver.optimized.ts runs via its own `bench:optimized` script
    // (vitest.config.optimized.ts) — kept separate so `npm run bench` still
    // measures only the default-launch experience by default.
    testTimeout: 180_000,
    hookTimeout: 60_000,
    teardownTimeout: 30_000,
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
  },
  esbuild: {
    target: 'node18',
  },
});
