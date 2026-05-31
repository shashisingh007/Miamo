import { describe, it, expect } from 'vitest';
import { createOAuthStateStore } from '../oauthStateNonce';

const CID = 'client_abc';
const NOW = 1_700_000_000_000;

describe('oauthStateNonce', () => {
  it('issue + verify happy path', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r = s.verify({ state, nonce, clientId: CID, nowMs: NOW });
    expect(r.ok).toBe(true);
  });

  it('verify without nonce still works', () => {
    const s = createOAuthStateStore();
    const { state } = s.issue(CID, NOW);
    const r = s.verify({ state, clientId: CID, nowMs: NOW });
    expect(r.ok).toBe(true);
  });

  it('unknown state rejected', () => {
    const s = createOAuthStateStore();
    const r = s.verify({ state: 'nope', clientId: CID });
    expect((r as any).reason).toBe('unknown_state');
  });

  it('client mismatch rejected', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r = s.verify({ state, nonce, clientId: 'other', nowMs: NOW });
    expect((r as any).reason).toBe('client_mismatch');
  });

  it('nonce mismatch rejected', () => {
    const s = createOAuthStateStore();
    const { state } = s.issue(CID, NOW);
    const r = s.verify({ state, nonce: 'wrong', clientId: CID, nowMs: NOW });
    expect((r as any).reason).toBe('nonce_mismatch');
  });

  it('expired after TTL', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r = s.verify({
      state, nonce, clientId: CID,
      nowMs: NOW + 11 * 60 * 1000,
    });
    expect((r as any).reason).toBe('expired');
  });

  it('single-use: second verify -> already_consumed', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r1 = s.verify({ state, nonce, clientId: CID, nowMs: NOW });
    expect(r1.ok).toBe(true);
    const r2 = s.verify({ state, nonce, clientId: CID, nowMs: NOW });
    expect((r2 as any).reason).toBe('already_consumed');
  });

  it('issued state and nonce are non-empty and unique', () => {
    const s = createOAuthStateStore();
    const a = s.issue(CID, NOW);
    const b = s.issue(CID, NOW);
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.state.length).toBeGreaterThan(20);
  });

  it('purgeExpired removes old + consumed', () => {
    const s = createOAuthStateStore();
    s.issue(CID, NOW);                              // expired-old
    const { state, nonce } = s.issue(CID, NOW + 10_000_000); // future
    s.verify({ state, nonce, clientId: CID, nowMs: NOW + 10_000_000 }); // consumed
    const removed = s.purgeExpired(NOW + 10_000_000, 10 * 60 * 1000);
    expect(removed).toBeGreaterThanOrEqual(2);
    expect(s.size()).toBe(0);
  });

  it('custom TTL honored', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r = s.verify({
      state, nonce, clientId: CID,
      nowMs: NOW + 5_000,
      ttlMs: 1_000,
    });
    expect((r as any).reason).toBe('expired');
  });

  it('different-length nonce rejected as mismatch', () => {
    const s = createOAuthStateStore();
    const { state, nonce } = s.issue(CID, NOW);
    const r = s.verify({ state, nonce: nonce + 'x', clientId: CID, nowMs: NOW });
    expect((r as any).reason).toBe('nonce_mismatch');
  });
});
