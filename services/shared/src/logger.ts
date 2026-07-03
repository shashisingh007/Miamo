// ─── Production-safe Logger ──────────────────────────
// Only logs in development or when LOG_LEVEL is explicitly set
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'error');

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
const current = LEVELS[logLevel] ?? 1;

// ─── PII redaction ───────────────────────────────────
// Strips obvious secrets and PII from log payloads before they reach stdout.
// Catches the common shapes: { password, token, accessToken, refreshToken,
// authorization, jwt, secret, apiKey, encryptionKey } plus any header named
// "authorization" or "cookie". Strings that look like JWTs (eyJ...) are
// truncated. Applied recursively to objects/arrays up to depth 5.
const PII_KEYS = new Set([
  'password', 'passwordhash', 'token', 'accesstoken', 'refreshtoken',
  'authorization', 'jwt', 'secret', 'apikey', 'apisecret',
  'encryptionkey', 'encryptionsalt', 'cookie', 'set-cookie',
  'internalkey', 'x-internal-key', 'sessionid',
]);
const JWT_LIKE = /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 5 || v == null) return v;
  if (typeof v === 'string') {
    return JWT_LIKE.test(v) ? `${v.slice(0, 12)}…[redacted]` : v;
  }
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = redact(val, depth + 1);
      }
    }
    return out;
  }
  return v;
}

function redactArgs(args: unknown[]): unknown[] {
  return args.map((a) => redact(a));
}

/**
 * Production-safe structured logger.
 *
 * Log level is determined by `LOG_LEVEL` env var (default: 'debug' in dev, 'error' in prod).
 * Levels: debug < info < warn < error < silent.
 * Messages below the current level are suppressed.
 *
 * All payloads pass through a redactor that strips passwords, tokens,
 * cookies, and JWT-shaped strings before reaching stdout — safe to ship to
 * any log aggregator without leaking credentials.
 */
export const logger = {
  /** Log debug-level messages (development only by default) */
  debug: (...args: unknown[]) => { if (current <= 0) console.log('[DEBUG]', ...redactArgs(args)); },
  /** Log informational messages */
  info: (...args: unknown[]) => { if (current <= 1) console.log('[INFO]', ...redactArgs(args)); },
  /** Log warning messages */
  warn: (...args: unknown[]) => { if (current <= 2) console.warn('[WARN]', ...redactArgs(args)); },
  /** Log error messages (always visible unless LOG_LEVEL=silent) */
  error: (...args: unknown[]) => { if (current <= 3) console.error('[ERROR]', ...redactArgs(args)); },
};

export default logger;
