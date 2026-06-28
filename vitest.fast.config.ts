import { defineConfig } from 'vitest/config';

// Fast test config: skips the ~900 self-contained pure-math algo library
// tests under services/shared/src/algo/__tests__/ that don't exercise any
// production code path. Use `npm test` for the full suite.
export default defineConfig({
  test: {
    include: [
      'tests/**/*.{test,spec}.ts',
      'services/ingest/**/*.{test,spec}.ts',
      'services/tracking-worker/**/*.{test,spec}.ts',
      'services/shared/src/algo/__tests__/forYou.test.ts',
      'services/shared/src/algo/__tests__/aiPicks.test.ts',
      'services/shared/src/algo/__tests__/moves.test.ts',
      // v3.6.0 — premium resolver tests (mock-Prisma, no DB).
      'services/shared/src/__tests__/premium.test.ts',
      // v1 production-readiness — per-endpoint rate limiters.
      'services/shared/src/__tests__/rateLimits.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node',
    globals: false,
    testTimeout: 10_000,
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 8, useAtomics: true },
    },
  },
});
