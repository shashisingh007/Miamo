import { describe, it, expect } from 'vitest';
import {
  evaluateConsent,
  summarizeConsent,
  type ConsentRecord,
} from '../consentScopeEvaluator';

const NOW = 1_700_000_000_000;

describe('consentScopeEvaluator', () => {
  it('never_set when no records', () => {
    const r = evaluateConsent([], 'analytics', { nowMs: NOW });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('never_set');
  });

  it('granted record allows', () => {
    const rec: ConsentRecord = { scope: 'analytics', granted: true, tsMs: NOW };
    const r = evaluateConsent([rec], 'analytics', { nowMs: NOW });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('granted');
  });

  it('denied (never granted) -> denied reason', () => {
    const rec: ConsentRecord = { scope: 'analytics', granted: false, tsMs: NOW };
    const r = evaluateConsent([rec], 'analytics', { nowMs: NOW });
    expect(r.reason).toBe('denied');
  });

  it('revoked (was granted, latest denied) -> revoked reason', () => {
    const records: ConsentRecord[] = [
      { scope: 'analytics', granted: true, tsMs: NOW - 10_000 },
      { scope: 'analytics', granted: false, tsMs: NOW },
    ];
    const r = evaluateConsent(records, 'analytics', { nowMs: NOW });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('revoked');
  });

  it('latest record wins (out-of-order)', () => {
    const records: ConsentRecord[] = [
      { scope: 'analytics', granted: false, tsMs: NOW },
      { scope: 'analytics', granted: true, tsMs: NOW + 1 },
    ];
    expect(evaluateConsent(records, 'analytics', { nowMs: NOW + 1 }).allowed).toBe(true);
  });

  it('expired when older than ttl', () => {
    const rec: ConsentRecord = { scope: 'marketing', granted: true, tsMs: NOW - 60_000 };
    const r = evaluateConsent([rec], 'marketing', { nowMs: NOW, ttlMs: 30_000 });
    expect(r.reason).toBe('expired');
  });

  it('ttl=0 disables expiry', () => {
    const rec: ConsentRecord = { scope: 'marketing', granted: true, tsMs: NOW - 1_000_000 };
    const r = evaluateConsent([rec], 'marketing', { nowMs: NOW, ttlMs: 0 });
    expect(r.allowed).toBe(true);
  });

  it('functional scope always allowed', () => {
    const r = evaluateConsent([], 'functional', { nowMs: NOW });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('always_required');
  });

  it('records of other scopes ignored', () => {
    const r = evaluateConsent(
      [{ scope: 'marketing', granted: true, tsMs: NOW }],
      'analytics',
      { nowMs: NOW },
    );
    expect(r.reason).toBe('never_set');
  });

  it('ignores records with non-finite tsMs', () => {
    const r = evaluateConsent(
      [{ scope: 'analytics', granted: true, tsMs: NaN } as any],
      'analytics',
      { nowMs: NOW },
    );
    expect(r.reason).toBe('never_set');
  });

  it('summarizeConsent returns all scopes', () => {
    const s = summarizeConsent([], { nowMs: NOW });
    expect(s.functional.allowed).toBe(true);
    expect(s.analytics.allowed).toBe(false);
    expect(s.marketing.reason).toBe('never_set');
    expect(s.personalization.reason).toBe('never_set');
    expect(s.sale_share.reason).toBe('never_set');
  });
});
