/**
 * Global JS + network error collector.
 *
 * Stack frames are truncated and stripped of `?token=` / `&secret=` params.
 * Network errors are reported via a wrapped fetch + an `unhandledrejection`
 * listener. We intentionally don't capture response bodies — they may
 * contain PII.
 */

type Emit = (event: { e: string; p?: Record<string, unknown> }) => void;

const SECRETY = /([?&])(token|secret|password|key|access_token|refresh_token|session)=([^&]+)/gi;

function scrub(s: string): string {
  return s.replace(SECRETY, '$1$2=***').slice(0, 1024);
}

export function installErrors(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onErr = (ev: ErrorEvent): void => {
    emit({
      e: 'error.js',
      p: {
        msg: scrub(String(ev.message || '')),
        src: scrub(String(ev.filename || '')),
        line: ev.lineno || 0,
        col: ev.colno || 0,
      },
    });
  };

  const onReject = (ev: PromiseRejectionEvent): void => {
    const reason = ev.reason as { message?: string; stack?: string } | string | undefined;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'unhandled';
    emit({ e: 'error.js', p: { msg: scrub(String(msg)), kind: 'unhandled_rejection' } });
  };

  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onReject);

  // Wrap fetch for network error visibility (status only, never bodies).
  const origFetch = window.fetch.bind(window);
  window.fetch = async function patched(input: RequestInfo | URL, init?: RequestInit) {
    const started = performance.now();
    try {
      const res = await origFetch(input, init);
      if (!res.ok && res.status >= 500) {
        emit({
          e: 'error.network',
          p: {
            url: scrub(typeof input === 'string' ? input : (input as URL).toString?.() || ''),
            status: res.status,
            d: Math.round(performance.now() - started),
          },
        });
      }
      return res;
    } catch (e) {
      emit({
        e: 'error.network',
        p: {
          url: scrub(typeof input === 'string' ? input : (input as URL).toString?.() || ''),
          msg: scrub((e as Error).message || 'fetch_failed'),
          d: Math.round(performance.now() - started),
        },
      });
      throw e;
    }
  };

  return () => {
    window.removeEventListener('error', onErr);
    window.removeEventListener('unhandledrejection', onReject);
    window.fetch = origFetch;
  };
}
