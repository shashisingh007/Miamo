import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    // E2E tests require running services — run separately
    exclude: ['tests/e2e/**'],
    setupFiles: [],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
