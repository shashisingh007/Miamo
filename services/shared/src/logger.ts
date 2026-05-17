// ─── Production-safe Logger ──────────────────────────
// Only logs in development or when LOG_LEVEL is explicitly set
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'error');

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
const current = LEVELS[logLevel] ?? 1;

/**
 * Production-safe structured logger.
 *
 * Log level is determined by `LOG_LEVEL` env var (default: 'debug' in dev, 'error' in prod).
 * Levels: debug < info < warn < error < silent.
 * Messages below the current level are suppressed.
 */
export const logger = {
  /** Log debug-level messages (development only by default) */
  debug: (...args: unknown[]) => { if (current <= 0) console.log('[DEBUG]', ...args); },
  /** Log informational messages */
  info: (...args: unknown[]) => { if (current <= 1) console.log('[INFO]', ...args); },
  /** Log warning messages */
  warn: (...args: unknown[]) => { if (current <= 2) console.warn('[WARN]', ...args); },
  /** Log error messages (always visible unless LOG_LEVEL=silent) */
  error: (...args: unknown[]) => { if (current <= 3) console.error('[ERROR]', ...args); },
};

export default logger;
