// ─── Shared Environment / Secret Resolution ──────────
// Centralizes resolution of secrets so production cannot silently fall
// back to the committed dev defaults. In `NODE_ENV=production` every
// secret is REQUIRED — startup fails fast with a clear error.
//
// Memoized: each name resolves once per process so callers can use it
// in hot paths without env lookup cost.

import { logger } from './logger';

const IS_PROD = process.env.NODE_ENV === 'production';

// Dev-only fallbacks. NEVER used in production. Kept identical to the
// values that were previously hardcoded inline in every service so that
// existing local/dev/docker workflows keep working unchanged.
const DEV_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'miamo-dev-jwt-secret-change-in-production-2026',
  JWT_REFRESH_SECRET: 'miamo-refresh-secret-change',
  INTERNAL_SERVICE_KEY: 'miamo-internal-dev-key',
  ENCRYPTION_KEY: 'miamo-internal-dev-key',
  ENCRYPTION_SALT: 'miamo-e2e-salt-2026',
};

const cache = new Map<string, string>();
const warned = new Set<string>();

/**
 * Resolve a required secret from `process.env`.
 *
 * - In production: throws on startup if the env var is missing.
 * - In development/test: falls back to a well-known dev default and
 *   logs a single one-time warning so devs see what they are using.
 */
export function requireSecret(name: keyof typeof DEV_DEFAULTS | string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length > 0) {
    cache.set(name, fromEnv);
    return fromEnv;
  }

  if (IS_PROD) {
    throw new Error(`FATAL: ${name} must be set in production`);
  }

  const fallback = DEV_DEFAULTS[name];
  if (!fallback) {
    throw new Error(`FATAL: ${name} is not set and has no dev default`);
  }
  if (!warned.has(name)) {
    warned.add(name);
    logger.warn(`[env] using insecure dev default for ${name} (set ${name} in env to override)`);
  }
  cache.set(name, fallback);
  return fallback;
}

/** Lazily-resolved getters for the secrets used across services. */
export const env = {
  get jwtSecret() { return requireSecret('JWT_SECRET'); },
  get jwtRefreshSecret() { return requireSecret('JWT_REFRESH_SECRET'); },
  get internalServiceKey() { return requireSecret('INTERNAL_SERVICE_KEY'); },
  get encryptionKey() { return requireSecret('ENCRYPTION_KEY'); },
  get encryptionSalt() { return requireSecret('ENCRYPTION_SALT'); },
};
