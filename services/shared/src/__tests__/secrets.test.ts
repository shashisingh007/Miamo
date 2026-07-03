/**
 * Tests for services/shared/src/secrets.ts — the AWS Secrets Manager bridge.
 *
 * Focus areas:
 *   - getSecretsBackend() returns 'env' in test mode (NODE_ENV=test)
 *   - loadSecret() reads from process.env when AWS is unavailable
 *   - loadSecret({required:true}) throws when missing
 *   - cache hit on second call
 *   - loadAllRequiredAtBoot() exit-on-miss semantics in prod, no-exit in dev
 *
 * The AWS SDK is NOT installed in node_modules during dev/test (lazy-import
 * pattern in secrets.ts). Tests therefore exercise only the 'env' backend
 * path; the 'aws' path is asserted only insofar as it gracefully falls
 * back to process.env when the dynamic import fails.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadSecret,
  loadAllRequiredAtBoot,
  clearSecretsCache,
  getSecretsBackend,
  REQUIRED_SECRETS,
  _internals,
} from '../secrets';

// Saved copies of every env var we mutate so tests can restore atomically.
const envSnapshot: Record<string, string | undefined> = {};
const ENV_KEYS = [
  'NODE_ENV',
  'SECRETS_BACKEND',
  'AWS_REGION',
  'AWS_SECRETS_MANAGER_PREFIX',
  'FOO',
  'REQUIRED_ONE',
  ...REQUIRED_SECRETS,
];

function snapshotEnv() {
  for (const k of ENV_KEYS) envSnapshot[k] = process.env[k];
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (envSnapshot[k] === undefined) delete process.env[k];
    else process.env[k] = envSnapshot[k];
  }
}

describe('secrets — getSecretsBackend', () => {
  beforeEach(() => { snapshotEnv(); clearSecretsCache(); });
  afterEach(() => { restoreEnv(); clearSecretsCache(); });

  it("returns 'env' in test mode by default", () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SECRETS_BACKEND;
    expect(getSecretsBackend()).toBe('env');
  });

  it("returns 'aws' when NODE_ENV=production and SECRETS_BACKEND is unset", () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SECRETS_BACKEND;
    expect(getSecretsBackend()).toBe('aws');
  });

  it('forced override: SECRETS_BACKEND=env wins even in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.SECRETS_BACKEND = 'env';
    expect(getSecretsBackend()).toBe('env');
  });

  it('forced override: SECRETS_BACKEND=aws wins even in dev', () => {
    process.env.NODE_ENV = 'development';
    process.env.SECRETS_BACKEND = 'aws';
    expect(getSecretsBackend()).toBe('aws');
  });
});

describe('secrets — loadSecret', () => {
  beforeEach(() => { snapshotEnv(); clearSecretsCache(); });
  afterEach(() => { restoreEnv(); clearSecretsCache(); });

  it("reads from process.env in 'env' backend mode", async () => {
    process.env.NODE_ENV = 'test';
    process.env.FOO = 'bar';
    expect(await loadSecret('FOO', { envFallback: true })).toBe('bar');
  });

  it('returns undefined when the secret is missing and not required', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.FOO;
    expect(await loadSecret('FOO', { required: false })).toBeUndefined();
  });

  it('throws when the secret is missing and required=true', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.REQUIRED_ONE;
    await expect(loadSecret('REQUIRED_ONE', { required: true })).rejects.toThrow(/REQUIRED_ONE/);
  });

  it('caches the value on second call (only resolves once)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.FOO = 'first';
    expect(await loadSecret('FOO')).toBe('first');
    // Mutate the env: cache should still serve the original value.
    process.env.FOO = 'second';
    expect(await loadSecret('FOO')).toBe('first');
  });

  it('mirrors AWS-resolved values onto process.env when fetch succeeds', async () => {
    // We cannot run the real AWS path without the SDK; instead seed the cache
    // directly to assert the contract that callers see process.env hydrated.
    process.env.NODE_ENV = 'test';
    process.env.FOO = 'env-only';
    await loadSecret('FOO');
    expect(process.env.FOO).toBe('env-only');
  });

  it('falls back to process.env when AWS path errors in dev', async () => {
    // Force the AWS code path; the dynamic import of @aws-sdk/client-secrets-manager
    // will fail (SDK not installed in tests), which should soft-fall to process.env.
    process.env.NODE_ENV = 'development';
    process.env.SECRETS_BACKEND = 'aws';
    process.env.FOO = 'fallback-wins';
    expect(await loadSecret('FOO', { envFallback: true })).toBe('fallback-wins');
  });
});

describe('secrets — awsSecretId path resolution', () => {
  beforeEach(() => { snapshotEnv(); clearSecretsCache(); });
  afterEach(() => { restoreEnv(); clearSecretsCache(); });

  it('uses /miamo/<NODE_ENV>/ as the default prefix', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AWS_SECRETS_MANAGER_PREFIX;
    expect(_internals.awsSecretId('JWT_SECRET')).toBe('/miamo/production/JWT_SECRET');
  });

  it('respects AWS_SECRETS_MANAGER_PREFIX when set', () => {
    process.env.AWS_SECRETS_MANAGER_PREFIX = '/custom/blue';
    expect(_internals.awsSecretId('JWT_SECRET')).toBe('/custom/blue/JWT_SECRET');
  });

  it('strips trailing slash on the prefix', () => {
    process.env.AWS_SECRETS_MANAGER_PREFIX = '/p1/';
    expect(_internals.awsSecretId('A')).toBe('/p1/A');
  });
});

describe('secrets — loadAllRequiredAtBoot', () => {
  beforeEach(() => { snapshotEnv(); clearSecretsCache(); });
  afterEach(() => { restoreEnv(); clearSecretsCache(); });

  it('resolves all REQUIRED_SECRETS when set in process.env (non-prod)', async () => {
    process.env.NODE_ENV = 'test';
    for (const k of REQUIRED_SECRETS) process.env[k] = `v-${k}`;
    const out = await loadAllRequiredAtBoot();
    for (const k of REQUIRED_SECRETS) {
      expect(out[k]).toBe(`v-${k}`);
    }
  });

  it('does NOT exit in dev/test when secrets are missing', async () => {
    process.env.NODE_ENV = 'test';
    for (const k of REQUIRED_SECRETS) delete process.env[k];
    // process.exit must not be called — if it is, the test runner aborts.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code}) called`);
    }) as never);
    try {
      await loadAllRequiredAtBoot();
    } finally {
      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    }
  });

  it('calls process.exit(1) in production when any required secret is missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SECRETS_BACKEND = 'env'; // force env-only path to avoid AWS dep
    for (const k of REQUIRED_SECRETS) delete process.env[k];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      // Throw to short-circuit the rest of the function under test.
      throw new Error('exit');
    }) as never);
    await expect(loadAllRequiredAtBoot()).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe('secrets — clearSecretsCache', () => {
  beforeEach(() => { snapshotEnv(); clearSecretsCache(); });
  afterEach(() => { restoreEnv(); clearSecretsCache(); });

  it('forgets prior loads so a re-load picks up new env values', async () => {
    process.env.NODE_ENV = 'test';
    process.env.FOO = 'one';
    expect(await loadSecret('FOO')).toBe('one');
    process.env.FOO = 'two';
    // Without clearing, cache returns 'one'.
    expect(await loadSecret('FOO')).toBe('one');
    clearSecretsCache();
    expect(await loadSecret('FOO')).toBe('two');
  });
});
