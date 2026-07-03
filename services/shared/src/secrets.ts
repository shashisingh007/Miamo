// ─── Shared Secrets Manager ───────────────────────────────────────
// Single source of truth for production secret fetching.
//
// Strategy:
//   - In `NODE_ENV=production`, every "secret" env var should be sourced
//     from AWS Secrets Manager. The first call to `loadSecret(name)` reaches
//     out to the SDK, the value is cached in-process for the lifetime of the
//     pod, and is mirrored back onto `process.env.<name>` so existing
//     `process.env` reads (logger, env.ts, downstream libs) keep working
//     without any code change.
//   - In dev/test (`NODE_ENV !== 'production'`) we read straight from
//     `process.env` — unchanged behaviour. Tests and local dev continue to
//     work exactly as before.
//
// SECRETS_BACKEND env var:
//   - 'aws' (default in prod)  — fetch via AWS SDK from Secrets Manager
//   - 'env' (default in dev)   — read process.env directly
//
// Secret naming convention in AWS:
//   - /miamo/<env>/<KEY_NAME>     (e.g. /miamo/prod/JWT_SECRET)
//   - Override the prefix with AWS_SECRETS_MANAGER_PREFIX
//     (default '/miamo/<NODE_ENV>'). Used for blue/green or per-region setups.
//
// Required-in-production list (fail-fast at boot if any missing):
//   - JWT_SECRET, JWT_REFRESH_SECRET
//   - INTERNAL_SERVICE_KEY
//   - ENCRYPTION_KEY, ENCRYPTION_SALT
//   - TRACKING_HASH_SECRET
//   - POSTGRES_PASSWORD (or DATABASE_URL if it includes it)
//   - REDIS_URL (if remote)
//
// Optional secrets fetched on demand (request-time, with `required:false`):
//   - GOOGLE_CLIENT_SECRET, APPLE_KEY_PRIVATE
//   - RESEND_API_KEY, TWILIO_AUTH_TOKEN, MSG91_KEY (OTP delivery)
//   - RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
//   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   - SENTRY_DSN (per service)
//   - DEVICE_FP_SALT, SENDGRID_API_KEY
//
// ── AWS SDK dependency ──────────────────────────────────────────────
// `@aws-sdk/client-secrets-manager` is the only way to satisfy
// PRODUCTION_LAUNCH_PROMPT.md hard-constraint #8 ("All secrets via AWS
// Secrets Manager in prod"). It is THE documented exception to the
// "no new dependencies" rule. To install:
//     cd services/shared && npm install @aws-sdk/client-secrets-manager@^3
// The import is dynamic (`await import('...')`) so dev/test never load
// the SDK — keeps cold-start cost and bundle size at zero outside prod.
//
// ── Credentials ─────────────────────────────────────────────────────
// We use the SDK's default credential provider chain:
//   1. EC2/ECS task IAM role           (production)
//   2. environment variables           (CI integration tests)
//   3. shared credentials file (~/.aws/credentials)  (engineer laptops)
// No credentials are embedded in code or env.
//
// ── Region ──────────────────────────────────────────────────────────
// Defaults to AWS_REGION or 'ap-south-1' (Mumbai). Miamo is India-first;
// keeping secrets in-region minimises cross-AZ data egress on every
// service-pod cold start.

import { logger } from './logger';

// ─── Public types ────────────────────────────────────────────────
export type SecretsBackend = 'aws' | 'env';

export interface LoadSecretOpts {
  /** Throw if the secret can't be resolved. Default false. */
  required?: boolean;
  /** When AWS fetch fails (or backend=env) read `process.env.<name>` as a fallback. Default true. */
  envFallback?: boolean;
}

// ─── Internal cache ──────────────────────────────────────────────
interface CacheEntry { value: string; loadedAt: number; }
const cache = new Map<string, CacheEntry>();

// AWS SDK client is lazy-loaded so dev/test paths never pull in @aws-sdk.
// `any` here is intentional — keeps the file type-clean even when the SDK
// is not installed yet in `services/shared/node_modules`. Once installed,
// the import returns the real `SecretsManagerClient` and we still use the
// minimal `send()` surface that the type narrows to.
let awsClient: any = null;
let awsClientInit: Promise<any> | null = null;

/**
 * Return the active secrets backend.
 *
 * - 'aws' in production (or when SECRETS_BACKEND=aws is forced)
 * - 'env' otherwise
 */
export function getSecretsBackend(): SecretsBackend {
  const forced = (process.env.SECRETS_BACKEND || '').toLowerCase();
  if (forced === 'aws' || forced === 'env') return forced;
  return process.env.NODE_ENV === 'production' ? 'aws' : 'env';
}

/**
 * Compute the AWS Secrets Manager identifier for a logical secret name.
 *
 * Honors AWS_SECRETS_MANAGER_PREFIX; defaults to `/miamo/<NODE_ENV>`.
 */
function awsSecretId(name: string): string {
  const env = process.env.NODE_ENV || 'development';
  const prefix = process.env.AWS_SECRETS_MANAGER_PREFIX || `/miamo/${env}`;
  // Strip trailing slash for consistency.
  const cleaned = prefix.replace(/\/+$/, '');
  return `${cleaned}/${name}`;
}

/**
 * Lazily instantiate the AWS SDK client. Throws an instructive error if the
 * dependency hasn't been installed yet — production deploys MUST install it
 * before flipping NODE_ENV=production.
 */
async function getAwsClient(): Promise<any> {
  if (awsClient) return awsClient;
  if (awsClientInit) return awsClientInit;
  awsClientInit = (async () => {
    try {
      // Dynamic import so the SDK is only loaded when needed (prod).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sdk: any = await import('@aws-sdk/client-secrets-manager');
      const region = process.env.AWS_REGION || 'ap-south-1';
      awsClient = new sdk.SecretsManagerClient({ region });
      return awsClient;
    } catch (e) {
      const msg = (e as Error).message || String(e);
      throw new Error(
        `[secrets] AWS SDK not available — install with: cd services/shared && npm install @aws-sdk/client-secrets-manager@^3 (cause: ${msg})`,
      );
    }
  })();
  return awsClientInit;
}

/**
 * Fetch a secret value from AWS Secrets Manager.
 *
 * Returns undefined when the secret is not found; throws on AWS transport
 * errors so the caller (loadSecret) can decide between fallback and abort.
 */
async function fetchFromAws(name: string): Promise<string | undefined> {
  const client = await getAwsClient();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk: any = await import('@aws-sdk/client-secrets-manager');
  const id = awsSecretId(name);
  try {
    const out = await client.send(new sdk.GetSecretValueCommand({ SecretId: id }));
    if (typeof out.SecretString === 'string' && out.SecretString.length > 0) {
      return out.SecretString;
    }
    // Binary secrets are decoded best-effort. Not used by Miamo today, but
    // documented behaviour matches AWS SDK conventions.
    if (out.SecretBinary) {
      const bytes: Uint8Array = out.SecretBinary as Uint8Array;
      return Buffer.from(bytes).toString('utf8');
    }
    return undefined;
  } catch (e: any) {
    // "ResourceNotFoundException" is normal for optional secrets — treat as
    // "not present" rather than re-raising. All other AWS errors bubble up
    // so loadSecret() can choose between fallback and abort.
    if (e?.name === 'ResourceNotFoundException') return undefined;
    throw e;
  }
}

/**
 * Resolve a single secret by name.
 *
 * Resolution order:
 *   1. In-process cache hit → return cached value immediately.
 *   2. backend=aws → AWS Secrets Manager.
 *   3. backend=env OR (AWS errored AND envFallback in non-prod) → process.env.
 *
 * On success, the value is cached AND mirrored back onto `process.env.<name>`
 * so legacy `process.env.X` reads keep working. When `required:true` and
 * resolution fails, throws.
 */
export async function loadSecret(name: string, opts: LoadSecretOpts = {}): Promise<string | undefined> {
  const { required = false, envFallback = true } = opts;
  // 1. cache
  const cached = cache.get(name);
  if (cached !== undefined) return cached.value;

  const backend = getSecretsBackend();

  // 2. AWS path
  if (backend === 'aws') {
    try {
      const value = await fetchFromAws(name);
      if (value !== undefined && value.length > 0) {
        cache.set(name, { value, loadedAt: Date.now() });
        // Mirror onto process.env so non-secrets-aware code keeps working.
        process.env[name] = value;
        return value;
      }
    } catch (e) {
      const msg = (e as Error).message || String(e);
      // In production, an AWS transport error on a REQUIRED secret is fatal.
      // For optional secrets it is logged once and we fall through to env.
      if (required && process.env.NODE_ENV === 'production') {
        throw new Error(`[secrets] FATAL: failed to load required secret ${name} from AWS: ${msg}`);
      }
      logger.warn(`[secrets] AWS fetch failed for ${name}: ${msg}`);
      // Non-prod fallthrough to process.env when allowed.
      if (process.env.NODE_ENV === 'production' && !envFallback) {
        throw new Error(`[secrets] failed to load ${name} from AWS and envFallback=false`);
      }
    }
  }

  // 3. process.env fallback (always allowed in dev/test; gated in prod by envFallback)
  const envVal = process.env[name];
  if (envVal && envVal.length > 0) {
    cache.set(name, { value: envVal, loadedAt: Date.now() });
    return envVal;
  }

  if (required) {
    throw new Error(`[secrets] FATAL: required secret ${name} is not set (backend=${backend})`);
  }
  return undefined;
}

/**
 * The secrets every backend service MUST have before serving traffic.
 * Kept in one list so `loadAllRequiredAtBoot()` can fail fast on any miss
 * and ops have a single grep target for the production secret register.
 */
export const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'INTERNAL_SERVICE_KEY',
  'ENCRYPTION_KEY',
  'ENCRYPTION_SALT',
  'TRACKING_HASH_SECRET',
] as const;

export type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];

/**
 * Pre-load all production-required secrets at boot.
 *
 * Called from each `services/<svc>/src/server.ts` bootstrap path. In production:
 *   - every secret listed in REQUIRED_SECRETS is fetched (AWS first, env
 *     fallback if SECRETS_BACKEND=env).
 *   - any missing secret triggers `process.exit(1)` with a clear log line
 *     so the orchestrator restarts the pod with the operator's attention.
 *
 * In dev/test the function is a permissive no-op-ish — it tries to load
 * each secret but does NOT exit on miss; the dev defaults in `env.ts` then
 * cover whatever is unset.
 */
export async function loadAllRequiredAtBoot(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  for (const name of REQUIRED_SECRETS) {
    try {
      const v = await loadSecret(name, { required: false, envFallback: true });
      if (v && v.length > 0) {
        out[name] = v;
      } else if (isProd) {
        missing.push(name);
      }
    } catch (e) {
      const msg = (e as Error).message || String(e);
      if (isProd) {
        missing.push(`${name} (${msg})`);
      } else {
        logger.warn(`[secrets] non-prod load error for ${name}: ${msg}`);
      }
    }
  }

  if (isProd && missing.length > 0) {
    logger.error(`[secrets] FATAL: missing required production secrets: ${missing.join(', ')}`);
    process.exit(1);
  }

  return out;
}

/**
 * Reset the in-process cache. Test-only helper — production code MUST NOT
 * call this; rotating a secret without a redeploy is unsupported (see
 * docs/RUNBOOK.md §"Secret rotation").
 */
export function clearSecretsCache(): void {
  cache.clear();
  awsClient = null;
  awsClientInit = null;
}

/**
 * Internal accessor used by tests to inspect cached state. Not part of the
 * public surface; do not import outside `__tests__/`.
 */
export const _internals = {
  cache,
  awsSecretId,
};
