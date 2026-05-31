import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'services/shared/**/*.{test,spec}.ts',
      'services/ingest/**/*.{test,spec}.ts',
      'services/tracking-worker/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'services/web/**', // web has its own Next.js test setup if needed
    ],
    environment: 'node',
    globals: false,
    testTimeout: 10_000,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 8,
        useAtomics: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'services/web/**',
        'scripts/**',
      ],
    },
  },
});
