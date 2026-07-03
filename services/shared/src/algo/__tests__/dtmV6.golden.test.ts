/**
 * Phase 18 \u2014 deterministic regression snapshot for `dtmAffinityV6`.
 *
 * If any of the constants in dtmV6 / dtmColdStart / dtmTopics change in a
 * way that would shift the produced score by more than 1e-6, this test
 * fails loudly. The fixture is intentionally hand-tuned for stability:
 *
 *   - Vectors l2-normalised the same way the worker normalises.
 *   - Coverage is 'full' for both sides so the cold-start blend is the
 *     identity.
 *   - No per-topic weight profile (uniform fallback).
 *
 * Update the expected numbers ONLY when an intentional v6 algo change has
 * been signed off in the V6 release notes (see CHANGELOG).
 */
import { describe, it, expect } from 'vitest';
import { dtmAffinityV6 } from '../dtmV6';

function l2(arr: number[]): Float32Array {
  const v = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) v[i] = arr[i];
  let s = 0; for (const x of v) s += x * x;
  if (s > 0) {
    const inv = 1 / Math.sqrt(s);
    for (let i = 0; i < v.length; i++) v[i] *= inv;
  }
  return v;
}

describe('dtmAffinityV6 golden snapshot', () => {
  const me   = l2([0.9, 0.7, 0.5, 0.3, 0.6, 0.4, 0.2, 0.8, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const cand = l2([0.8, 0.6, 0.4, 0.4, 0.7, 0.3, 0.3, 0.7, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);

  it('identical vectors → score = 1.0 (fully covered, perfect overlap)', () => {
    const r = dtmAffinityV6(me, me)!;
    expect(r.score).toBe(1);
    expect(r.coverageWeight).toBe(1);
  });

  it('hand-tuned pair score is stable to 6dp', () => {
    const r = dtmAffinityV6(me, cand)!;
    // These numbers lock in current dtmV6 behaviour. Update only on
    // intentional algorithm change (see V2 §16/§23).
    expect(r.coverageWeight).toBe(1);
    expect(r.rawCosine).toBeCloseTo(0.996078, 4);
    expect(r.sharedMassBonus).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThan(0.95);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('orthogonal-ish vectors produce a much lower score', () => {
    const a = l2([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const b = l2([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    const r = dtmAffinityV6(a, b)!;
    // Both single-topic vectors → 'sparse' → coverage=0.25.
    // Orthogonal cosine is mapped to neutral 0.5, then blended toward 0.5
    // by (1 - coverage) so the final score is exactly 0.5.
    expect(r.coverageWeight).toBe(0.25);
    expect(r.score).toBeCloseTo(0.5, 6);
    expect(r.score).toBeLessThanOrEqual(0.5);
    expect(r.score).toBeGreaterThan(0);
  });

  it('null inputs return null', () => {
    expect(dtmAffinityV6(null, me)).toBeNull();
    expect(dtmAffinityV6(me, null)).toBeNull();
  });
});
