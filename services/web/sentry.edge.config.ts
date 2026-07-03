// Sentry edge-runtime bootstrap for Miamo web (Next.js App Router).
//
// Loaded by `@sentry/nextjs` on Edge functions / middleware. Same lazy-init
// contract as the server config: when `SENTRY_DSN` is unset the init is a
// no-op.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || '';
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.MIAMO_RELEASE || 'unknown',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}
