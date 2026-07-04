import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['bench.kendo-e2e.ts'],
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
