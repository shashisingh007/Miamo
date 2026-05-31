import { describe, it, expect } from 'vitest';
import {
  tryAcquireLeaderLease,
  tryRenewLeaderLease,
  isFencingTokenStale,
  type LeaderLeaseRecord,
} from '../leaderLeaseFencing';

const NOW = 1_700_000_000_000;

describe('leaderLeaseFencing', () => {
  it('acquires when no current holder; token starts at 1', () => {
    const d = tryAcquireLeaderLease({ current: null, candidateId: 'a', nowMs: NOW, ttlMs: 10_000 });
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.record.holderId).toBe('a');
      expect(d.record.fencingToken).toBe(1);
      expect(d.record.expiresAtMs).toBe(NOW + 10_000);
    }
  });

  it('blocked when held by other and not expired', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 1 };
    const d = tryAcquireLeaderLease({ current: cur, candidateId: 'b', nowMs: NOW + 1_000, ttlMs: 5_000 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('held_by_other');
  });

  it('takes over expired lease and bumps token', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 7 };
    const d = tryAcquireLeaderLease({ current: cur, candidateId: 'b', nowMs: NOW + 20_000, ttlMs: 5_000 });
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.record.holderId).toBe('b');
      expect(d.record.fencingToken).toBe(8);
    }
  });

  it('same holder re-acquire allowed and bumps token', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 3 };
    const d = tryAcquireLeaderLease({ current: cur, candidateId: 'a', nowMs: NOW + 1_000, ttlMs: 5_000 });
    expect(d.ok && d.record.fencingToken).toBe(4);
  });

  it('renew extends expiry, keeps token', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 9 };
    const d = tryRenewLeaderLease({ current: cur, holderId: 'a', nowMs: NOW + 5_000, ttlMs: 10_000 });
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.record.fencingToken).toBe(9);
      expect(d.record.expiresAtMs).toBe(NOW + 15_000);
      expect(d.renewed).toBe(true);
    }
  });

  it('renew by other holder rejected', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 1 };
    const d = tryRenewLeaderLease({ current: cur, holderId: 'b', nowMs: NOW + 1_000, ttlMs: 5_000 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('held_by_other');
  });

  it('renew after expiry rejected', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 10_000, fencingToken: 1 };
    const d = tryRenewLeaderLease({ current: cur, holderId: 'a', nowMs: NOW + 11_000, ttlMs: 5_000 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('expired');
  });

  it('renew with no current -> unknown_holder', () => {
    const d = tryRenewLeaderLease({ current: null, holderId: 'a', nowMs: NOW, ttlMs: 5_000 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('unknown_holder');
  });

  it('ttlMs floor=1', () => {
    const d = tryAcquireLeaderLease({ current: null, candidateId: 'a', nowMs: NOW, ttlMs: 0 });
    expect(d.ok && d.record.expiresAtMs).toBe(NOW + 1);
  });

  it('isFencingTokenStale detects older tokens', () => {
    expect(isFencingTokenStale(3, 5)).toBe(true);
    expect(isFencingTokenStale(5, 5)).toBe(false);
    expect(isFencingTokenStale(6, 5)).toBe(false);
  });

  it('at-expiry boundary: expiresAtMs == nowMs is expired', () => {
    const cur: LeaderLeaseRecord = { holderId: 'a', acquiredAtMs: NOW, expiresAtMs: NOW + 1_000, fencingToken: 1 };
    const d = tryAcquireLeaderLease({ current: cur, candidateId: 'b', nowMs: NOW + 1_000, ttlMs: 5_000 });
    expect(d.ok).toBe(true);
  });
});
