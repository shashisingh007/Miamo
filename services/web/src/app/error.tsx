'use client';

// ─── Root segment error boundary ─────────────────────────────────
// Caught by the Next.js App Router whenever a server or client error
// bubbles up past every nested error.tsx. Keeps the brand chrome (rose
// gradient, Miamo logo) so the user never sees a raw stack trace.
//
// `reset()` re-runs the segment render — useful for transient API
// errors (a flaky fetch, an expired token already refreshed, etc.).
import { useEffect } from 'react';

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // Surface to the browser console so devs can grab the digest.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[RootError]', error);
    }
    // v3.6.1 — capture the error to Sentry on the client so production
    // crashes surface in the same dashboard as backend exceptions. The
    // Sentry SDK is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset, so this
    // import is safe in every environment.
    void import('@sentry/nextjs')
      .then((Sentry) => { Sentry.captureException(error, { tags: { boundary: 'root' } }); })
      .catch(() => { /* package may be absent in fresh dev installs */ });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-miamo-bg px-6">
      <div className="max-w-md w-full bg-miamo-card rounded-2xl border border-zinc-200 p-8 text-center shadow-soft">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-main to-rose-dark flex items-center justify-center text-white text-2xl">
          ⚠
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-text-secondary mb-6">
          We hit an unexpected error. Try again — if it keeps happening, refresh the page or come back in a moment.
        </p>
        {error.digest && (
          <p className="text-xs text-text-secondary/70 mb-6 font-mono">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-main to-rose-dark text-white font-medium text-sm shadow-button hover:shadow-button-hover transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-main focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl border border-border text-text-primary font-medium text-sm hover:bg-miamo-card/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-main focus-visible:ring-offset-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
