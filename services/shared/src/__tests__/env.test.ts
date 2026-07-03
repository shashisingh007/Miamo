/**
 * Tests for services/shared/src/env.ts — specifically the new
 * `validateEnv(preset)` boot gate. Existing `requireSecret`/`env.*`
 * behaviour is covered indirectly by every service test that imports
 * shared utilities; here we focus on the new preset surface.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnv, _resetEnvWarnedForTests, _presetsForTests } from '../env';

const KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'INTERNAL_SERVICE_KEY',
  'ENCRYPTION_KEY',
  'ENCRYPTION_SALT',
  'TRACKING_HASH_SECRET',
  'REDIS_URL',
  'FRONTEND_URL',
  'AUTH_SERVICE_URL',
  'USER_SERVICE_URL',
  'SOCIAL_SERVICE_URL',
  'MESSAGING_SERVICE_URL',
  'CONTENT_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
  'INGEST_SERVICE_URL',
  'NEXT_PUBLIC_API_URL',
];
const snapshot: Record<string, string | undefined> = {};

function snap() { for (const k of KEYS) snapshot[k] = process.env[k]; }
function restore() {
  for (const k of KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
}

function setAll(preset: keyof typeof _presetsForTests, value = 'set') {
  for (const k of _presetsForTests[preset]) process.env[k] = value;
}

describe('env — validateEnv', () => {
  beforeEach(() => { snap(); _resetEnvWarnedForTests(); });
  afterEach(() => { restore(); _resetEnvWarnedForTests(); });

  it('passes when every required var is set (preset=backend)', () => {
    process.env.NODE_ENV = 'test';
    setAll('backend');
    // Should not throw and should not exit.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_c?: number) => {
      throw new Error('exit');
    }) as never);
    expect(() => validateEnv('backend')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('passes when every required var is set (preset=gateway)', () => {
    process.env.NODE_ENV = 'test';
    setAll('gateway');
    expect(() => validateEnv('gateway')).not.toThrow();
  });

  it('passes when every required var is set (preset=ingest)', () => {
    process.env.NODE_ENV = 'test';
    setAll('ingest');
    expect(() => validateEnv('ingest')).not.toThrow();
  });

  it('passes when every required var is set (preset=tracking-worker)', () => {
    process.env.NODE_ENV = 'test';
    setAll('tracking-worker');
    expect(() => validateEnv('tracking-worker')).not.toThrow();
  });

  it('warns but does not exit in dev when a required var is missing', () => {
    process.env.NODE_ENV = 'development';
    // Clear every backend var.
    for (const k of _presetsForTests.backend) delete process.env[k];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_c?: number) => {
      throw new Error('exit');
    }) as never);
    expect(() => validateEnv('backend')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('calls process.exit(1) in production when a required var is missing', () => {
    process.env.NODE_ENV = 'production';
    for (const k of _presetsForTests.backend) delete process.env[k];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_c?: number) => {
      throw new Error('exit-1');
    }) as never);
    expect(() => validateEnv('backend')).toThrow('exit-1');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('throws on unknown preset', () => {
    // @ts-expect-error — exercising the runtime guard.
    expect(() => validateEnv('not-a-preset')).toThrow(/unknown preset/);
  });

  it('does not double-warn for the same missing var on repeated calls', () => {
    process.env.NODE_ENV = 'development';
    for (const k of _presetsForTests.backend) delete process.env[k];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateEnv('backend');
    const firstCallCount = warnSpy.mock.calls.length;
    validateEnv('backend');
    // Same call set; warnings should be idempotent (one-shot per name).
    expect(warnSpy.mock.calls.length).toBe(firstCallCount);
    warnSpy.mockRestore();
  });
});
