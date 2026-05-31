import { describe, it, expect } from 'vitest';
import { decideTraceSample } from '../traceSampler';

describe('traceSampler', () => {
  it('deterministic for same uid/route/rate', () => {
    const a = decideTraceSample({ uid: 'u1', route: '/v1/x', sampleRate: 0.5 });
    const b = decideTraceSample({ uid: 'u1', route: '/v1/x', sampleRate: 0.5 });
    expect(a).toEqual(b);
  });

  it('rate 0 -> always dropped', () => {
    for (const uid of ['a', 'b', 'c']) {
      const r = decideTraceSample({ uid, route: '/x', sampleRate: 0 });
      expect(r.sampled).toBe(false);
      expect(r.reason).toBe('dropped');
    }
  });

  it('rate 1 -> always sampled', () => {
    for (const uid of ['a', 'b', 'c']) {
      const r = decideTraceSample({ uid, route: '/x', sampleRate: 1 });
      expect(r.sampled).toBe(true);
      expect(r.reason).toBe('rate');
    }
  });

  it('forceSample overrides rate', () => {
    const r = decideTraceSample({ uid: 'u', route: '/x', sampleRate: 0, forceSample: true });
    expect(r.sampled).toBe(true);
    expect(r.reason).toBe('forced');
  });

  it('invalid inputs -> not sampled', () => {
    expect(decideTraceSample({ uid: '', route: '/x', sampleRate: 1 }).reason).toBe('invalid');
    expect(decideTraceSample({ uid: 'u', route: '', sampleRate: 1 }).reason).toBe('invalid');
    expect(decideTraceSample({ uid: 'u', route: '/x', sampleRate: Number.NaN }).reason).toBe('dropped');
  });

  it('clamps rate outside [0,1]', () => {
    expect(decideTraceSample({ uid: 'u', route: '/x', sampleRate: -5 }).sampled).toBe(false);
    expect(decideTraceSample({ uid: 'u', route: '/x', sampleRate: 9 }).sampled).toBe(true);
  });

  it('different routes produce different buckets for the same uid', () => {
    const buckets = ['/a', '/b', '/c', '/d', '/e'].map(r =>
      decideTraceSample({ uid: 'u1', route: r, sampleRate: 0.5 }).bucket,
    );
    expect(new Set(buckets).size).toBe(buckets.length);
  });

  it('approximate distribution matches sample rate on a large cohort', () => {
    let sampled = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (decideTraceSample({ uid: `user_${i}`, route: '/v1/x', sampleRate: 0.2 }).sampled) sampled++;
    }
    const ratio = sampled / N;
    expect(ratio).toBeGreaterThan(0.15);
    expect(ratio).toBeLessThan(0.25);
  });

  it('bucket is in [0,1)', () => {
    for (let i = 0; i < 50; i++) {
      const r = decideTraceSample({ uid: `u${i}`, route: '/x', sampleRate: 0.5 });
      expect(r.bucket).toBeGreaterThanOrEqual(0);
      expect(r.bucket).toBeLessThan(1);
    }
  });
});
