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
      // v3.7 Temporal Learning v2 — pure algo tests, no DB, safe for fast suite.
      'services/shared/src/algo/__tests__/v9/**/*.test.ts',
      // Phase-G coverage-gap tests (dtmBatch previously had no test file;
      // coverage-gap-edge-cases covers untested branches across v8/v9).
      'services/shared/src/algo/__tests__/dtmBatch.test.ts',
      'services/shared/src/algo/__tests__/coverage-gap-edge-cases.test.ts',
      // Phase G.9 — third-party contract tests. Mocked fetch, no live
      // keys required; these guard against silent schema drift in
      // Nominatim / Sentry scrubber / Google OAuth / Razorpay.
      'tests/contract/**/*.test.ts',
      // Phase G.11 — moderation pipeline unit tests. Pure in-memory
      // (no DB, no network), safe for the fast suite.
      'tests/moderation/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      // Playwright specs live under tests/e2e/. They speak a different
      // runner (playwright test) and must be excluded from vitest.
      'tests/e2e/**',
    ],
    environment: 'node',
    globals: false,
    testTimeout: 10_000,
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 8, useAtomics: true },
    },
  },
});
