'use client';

// ─── Global error boundary (Next.js App Router) ─────────────────────
// Fired when an error escapes the root error.tsx OR happens inside the
// root layout itself. Per Next.js convention this MUST render its own
// <html>/<body>. We keep it minimal and forward the error to Sentry so
// production crashes are observable even at the layout level.
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    void import('@sentry/nextjs')
      .then((Sentry) => { Sentry.captureException(error, { tags: { boundary: 'global' } }); })
      .catch(() => { /* package may be absent in fresh dev installs */ });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              The app hit an unexpected error. Try again — if it keeps happening, refresh the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#999', fontFamily: 'monospace', marginBottom: 24 }}>
                Reference: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ec4899,#db2777)', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
