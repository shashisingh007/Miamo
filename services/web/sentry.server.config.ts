// Sentry server-side bootstrap for Miamo web (Next.js App Router).
//
// Loaded by `@sentry/nextjs` on the Node.js runtime (RSC, API routes,
// middleware). When `SENTRY_DSN` is unset the init is a no-op so local
// dev / preview builds boot without paying any overhead.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || '';
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.MIAMO_RELEASE || 'unknown',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Scrub the same headers as the backend `installSentry` helper so the
    // audit posture is consistent across services.
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
      } catch { /* never block delivery */ }
      return event;
    },
  });
}
