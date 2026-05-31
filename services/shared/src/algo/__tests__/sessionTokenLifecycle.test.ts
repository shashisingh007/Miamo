import { describe, it, expect } from 'vitest';
import { evaluateSessionLifecycle } from '../sessionTokenLifecycle';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('sessionTokenLifecycle', () => {
  it('fresh session -> active', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 60_000,
      nowMs: NOW,
    });
    expect(r.state).toBe('active');
    expect(r.reason).toBe('fresh');
  });

  it('near absolute expiry -> refresh', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - (30 * DAY - 30 * 60_000), // 30 min until abs cap
      lastUsedAtMs: NOW - 60_000,
      nowMs: NOW,
    });
    expect(r.state).toBe('refresh');
    expect(r.reason).toBe('near_expiry');
  });

  it('past absolute lifetime -> expired', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - (40 * DAY),
      lastUsedAtMs: NOW - HOUR,
      nowMs: NOW,
    });
    expect(r.state).toBe('expired');
    expect(r.reason).toBe('absolute_lifetime_reached');
  });

  it('past idle timeout -> expired', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - DAY,
      lastUsedAtMs: NOW - 24 * HOUR,
      nowMs: NOW,
    });
    expect(r.state).toBe('expired');
    expect(r.reason).toBe('idle_too_long');
  });

  it('revoked beats everything', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 1000,
      revokedAtMs: NOW - 60_000,
      nowMs: NOW,
    });
    expect(r.state).toBe('revoked');
  });

  it('future revokedAt ignored', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 1000,
      revokedAtMs: NOW + HOUR,
      nowMs: NOW,
    });
    expect(r.state).toBe('active');
  });

  it('ip changed + requireIpStability -> untrusted', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 60_000,
      ipChanged: true,
      requireIpStability: true,
      nowMs: NOW,
    });
    expect(r.state).toBe('untrusted');
    expect(r.reason).toBe('ip_changed');
  });

  it('ip changed without requireIpStability -> still active', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 60_000,
      ipChanged: true,
      nowMs: NOW,
    });
    expect(r.state).toBe('active');
  });

  it('custom refreshWindow honored', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - (30 * DAY - 3 * HOUR),
      lastUsedAtMs: NOW - 60_000,
      refreshWindowMs: 4 * HOUR,
      nowMs: NOW,
    });
    expect(r.state).toBe('refresh');
  });

  it('msUntilHardExpiry returns 0 when expired', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - 100 * DAY,
      lastUsedAtMs: NOW - 60_000,
      nowMs: NOW,
    });
    expect(r.msUntilHardExpiry).toBe(0);
  });

  it('msUntilHardExpiry is min(absRemaining, idleRemaining)', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - HOUR,
      lastUsedAtMs: NOW - 11 * HOUR,
      nowMs: NOW,
    });
    // idle remaining is ~1h, abs remaining ~29d23h \u2014 min picks idle
    expect(r.msUntilHardExpiry).toBeLessThan(2 * HOUR);
  });

  it('absoluteLifetime 0 means immediate expiry', () => {
    const r = evaluateSessionLifecycle({
      issuedAtMs: NOW - 1,
      lastUsedAtMs: NOW - 1,
      absoluteLifetimeMs: 0,
      nowMs: NOW,
    });
    expect(r.state).toBe('expired');
  });
});
