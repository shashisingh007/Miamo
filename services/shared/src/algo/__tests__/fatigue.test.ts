import { describe, it, expect } from 'vitest';
import { decay, recordImpression, resetOnDecision, fatiguePenalty } from '../fatigue';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

describe('decay', () => {
  it('halves count after one half-life (24h default)', () => {
    const r = decay({ count: 4, updatedAtMs: NOW }, NOW + 24 * HOUR);
    expect(r.count).toBeCloseTo(2, 5);
  });
  it('returns same count when dt = 0', () => {
    const r = decay({ count: 3, updatedAtMs: NOW }, NOW);
    expect(r.count).toBe(3);
  });
  it('does not mutate input', () => {
    const r = { count: 2, updatedAtMs: NOW };
    decay(r, NOW + HOUR);
    expect(r.count).toBe(2);
    expect(r.updatedAtMs).toBe(NOW);
  });
  it('honours custom halfLifeMs', () => {
    const r = decay({ count: 4, updatedAtMs: NOW }, NOW + HOUR, { halfLifeMs: HOUR });
    expect(r.count).toBeCloseTo(2, 5);
  });
});

describe('recordImpression', () => {
  it('starts at 1 from null record', () => {
    expect(recordImpression(null, NOW).count).toBe(1);
  });
  it('decays previous count then adds 1', () => {
    const r = recordImpression({ count: 4, updatedAtMs: NOW }, NOW + 24 * HOUR);
    expect(r.count).toBeCloseTo(3, 5); // 4 -> 2 (decayed) + 1
  });
  it('stamps updatedAtMs to nowMs', () => {
    const t = NOW + 5_000;
    expect(recordImpression(null, t).updatedAtMs).toBe(t);
  });
});

describe('resetOnDecision', () => {
  it('returns count=0 at nowMs', () => {
    const r = resetOnDecision(NOW);
    expect(r.count).toBe(0);
    expect(r.updatedAtMs).toBe(NOW);
  });
});

describe('fatiguePenalty', () => {
  it('returns 0 for null record', () => {
    expect(fatiguePenalty(null, NOW)).toBe(0);
  });
  it('scales count by step (default 2)', () => {
    expect(fatiguePenalty({ count: 3, updatedAtMs: NOW }, NOW)).toBe(6);
  });
  it('caps at maxPenalty (default 12)', () => {
    expect(fatiguePenalty({ count: 100, updatedAtMs: NOW }, NOW)).toBe(12);
  });
  it('uses decayed count, not raw count', () => {
    // 6 impressions, 24h ago -> decays to 3 -> penalty 6
    const p = fatiguePenalty({ count: 6, updatedAtMs: NOW }, NOW + 24 * HOUR);
    expect(p).toBeCloseTo(6, 5);
  });
  it('honours custom step and maxPenalty', () => {
    const p = fatiguePenalty({ count: 5, updatedAtMs: NOW }, NOW, { step: 1, maxPenalty: 4 });
    expect(p).toBe(4);
  });
  it('negative count clamped to 0', () => {
    expect(fatiguePenalty({ count: -5, updatedAtMs: NOW }, NOW)).toBe(0);
  });
});

describe('end-to-end behaviour', () => {
  it('reset wipes accumulated fatigue', () => {
    let rec = recordImpression(null, NOW);
    rec = recordImpression(rec, NOW + 1000);
    rec = recordImpression(rec, NOW + 2000);
    expect(fatiguePenalty(rec, NOW + 2000)).toBeGreaterThan(0);
    rec = resetOnDecision(NOW + 3000);
    expect(fatiguePenalty(rec, NOW + 3000)).toBe(0);
  });
});
