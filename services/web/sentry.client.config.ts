// Sentry client-side bootstrap for Miamo web (Next.js App Router).
//
// This file is automatically loaded by `@sentry/nextjs` on the browser side.
// Per the launch-audit Phase C.3 contract:
//   - Sentry is fully optional: when `NEXT_PUBLIC_SENTRY_DSN` is unset, init
//     is skipped so the app boots crash-free in dev/preview.
//   - We pin tracesSampleRate to 0.1 (10%) by default — Sentry free-tier
//     safe and consistent with the backend service default.
//   - `MIAMO_RELEASE` is baked at build time so source-maps line up with the
//     deployed bundle revision.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || '';
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.MIAMO_RELEASE || process.env.NEXT_PUBLIC_MIAMO_RELEASE || 'unknown',
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Match the backend scrub list to keep the audit posture symmetric.
    beforeSend(event) {
      try {
        const req = event.request;
        if (req?.headers && typeof req.headers === 'object') {
          const headers = req.headers as Record<string, string>;
          for (const name of Object.keys(headers)) {
            const lower = name.toLowerCase();
            if (lower === 'authorization' || lower === 'cookie' || lower === 'x-internal-key') {
              headers[name] = '[Filtered]';
            }
          }
        }
      } catch { /* belt-and-braces */ }
      return event;
    },
  });
}
