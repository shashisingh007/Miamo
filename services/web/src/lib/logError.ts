/**
 * Non-fatal client-side error logger.
 *
 * Replaces silent `.catch(() => {})` patterns so failures are at least
 * visible in dev tools / log aggregators without surfacing UI errors for
 * fire-and-forget calls (analytics pings, optimistic background loads).
 *
 * - In development: logs to `console.warn` with a context tag.
 * - In production: forwards to `window.__miamoLog` if defined (so a
 *   future Sentry / pino-http bridge can plug in), otherwise silent.
 */
export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[miamo] ${context}:`, message);
    return;
  }
  if (typeof window !== 'undefined') {
    const hook = (window as unknown as { __miamoLog?: (ctx: string, msg: string) => void }).__miamoLog;
    if (typeof hook === 'function') hook(context, message);
  }
}
