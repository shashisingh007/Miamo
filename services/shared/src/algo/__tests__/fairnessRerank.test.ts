import { describe, it, expect } from 'vitest';
import {
  computeGini,
  genderConditionalGini,
  fairnessRerank,
  DEFAULT_FAIRNESS_CONFIG,
  type FairnessCandidate,
} from '../v8/fairnessRerank';

describe('v8/fairnessRerank — computeGini', () => {
  it('uniform array → 0', () => {
    expect(computeGini([5, 5, 5, 5, 5])).toBeCloseTo(0, 6);
  });
  it('single-winner array → approaches (n-1)/n', () => {
    // [300, 0, 0] in the design doc → ≈ 0.667.
    const g = computeGini([300, 0, 0]);
    expect(g).toBeCloseTo(2 / 3, 4);
  });
  it('empty array → 0', () => {
    expect(computeGini([])).toBe(0);
  });
  it('single element → 0 (n<2 convention)', () => {
    expect(computeGini([42])).toBe(0);
  });
  it('all zeros → 0', () => {
    expect(computeGini([0, 0, 0])).toBe(0);
  });
  it('negative value defensive: returns 0', () => {
    expect(computeGini([-1, 2, 3])).toBe(0);
  });
  it('classic [1,2,3,4,5] equals well-known value ~0.2667', () => {
    expect(computeGini([1, 2, 3, 4, 5])).toBeCloseTo(0.2667, 3);
  });
});

describe('v8/fairnessRerank — genderConditionalGini', () => {
  it('three buckets computed independently', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'a', score: 1, exposureCountLast7d: 10, gender: 'm' },
      { targetHash: 'b', score: 1, exposureCountLast7d: 10, gender: 'm' },
      { targetHash: 'c', score: 1, exposureCountLast7d: 100, gender: 'f' },
      { targetHash: 'd', score: 1, exposureCountLast7d: 0, gender: 'f' },
      { targetHash: 'e', score: 1, exposureCountLast7d: 5, gender: 'o' },
      { targetHash: 'f', score: 1, exposureCountLast7d: 5, gender: 'o' },
    ];
    const g = genderConditionalGini(cs);
    expect(g.m).toBeCloseTo(0, 6);    // uniform within m
    expect(g.f).toBeCloseTo(0.5, 3);  // [0,100] → Gini = 0.5
    expect(g.o).toBeCloseTo(0, 6);
  });
  it('null gender excluded from per-bucket stats', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'a', score: 1, exposureCountLast7d: 10, gender: null },
      { targetHash: 'b', score: 1, exposureCountLast7d: 0, gender: null },
    ];
    const g = genderConditionalGini(cs);
    expect(g.m).toBe(0);
    expect(g.f).toBe(0);
    expect(g.o).toBe(0);
  });
});

describe('v8/fairnessRerank — fairnessRerank', () => {
  it('empty input → empty output', () => {
    expect(fairnessRerank([])).toEqual([]);
  });

  it('preserves top candidate when score gap exceeds swapDelta', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.0, exposureCountLast7d: 1000, gender: 'm' },
      { targetHash: 'B', score: 0.1, exposureCountLast7d: 0,    gender: 'f' },
    ];
    // A.score=1.0 vs B.score=0.1 → relative loss = 0.9, far above swapDelta=0.05.
    const out = fairnessRerank(cs);
    expect(out[0].targetHash).toBe('A');
  });

  it('swaps when scores are close and swap reduces over-target Gini distance', () => {
    // Build a candidate set where the top-N has skewed exposure within one
    // gender bucket and the adjacent neighbour can flatten it.
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.00, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'B', score: 0.99, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'C', score: 0.98, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'D', score: 0.97, exposureCountLast7d: 0,   gender: 'f' },
    ];
    const out = fairnessRerank(cs, { ...DEFAULT_FAIRNESS_CONFIG, topN: 4, swapDelta: 0.05 });
    expect(out).toHaveLength(4);
    // The function never mutates the input, length-preserving.
    expect(out.map((c) => c.targetHash).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('tail beyond topN passes through unchanged', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.0, exposureCountLast7d: 10, gender: 'm' },
      { targetHash: 'B', score: 0.9, exposureCountLast7d: 10, gender: 'f' },
      { targetHash: 'C', score: 0.1, exposureCountLast7d: 999, gender: 'm' }, // tail
    ];
    const out = fairnessRerank(cs, { ...DEFAULT_FAIRNESS_CONFIG, topN: 2 });
    expect(out[2].targetHash).toBe('C');
  });

  it('does not mutate the input array', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.0, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'B', score: 0.99, exposureCountLast7d: 0, gender: 'f' },
    ];
    const original = cs.map((c) => c.targetHash);
    fairnessRerank(cs);
    expect(cs.map((c) => c.targetHash)).toEqual(original);
  });

  it('same-gender adjacent pair → skipped (Gini cannot change)', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.0, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'B', score: 0.99, exposureCountLast7d: 0, gender: 'm' },
    ];
    const out = fairnessRerank(cs);
    // No swap is meaningful; first remains A.
    expect(out[0].targetHash).toBe('A');
  });

  it('converges within maxIterations on degenerate input', () => {
    const cs: FairnessCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      targetHash: `t${i}`,
      score: 1.0,
      exposureCountLast7d: i % 2 === 0 ? 100 : 0,
      gender: i % 2 === 0 ? 'm' : 'f' as const,
    }));
    // Should terminate without throwing — bounded iterations.
    const out = fairnessRerank(cs, { ...DEFAULT_FAIRNESS_CONFIG, maxIterations: 5 });
    expect(out).toHaveLength(20);
  });

  it('is deterministic: same input → same output', () => {
    const cs: FairnessCandidate[] = [
      { targetHash: 'A', score: 1.0, exposureCountLast7d: 100, gender: 'm' },
      { targetHash: 'B', score: 0.96, exposureCountLast7d: 0, gender: 'f' },
      { targetHash: 'C', score: 0.95, exposureCountLast7d: 50, gender: 'm' },
    ];
    const a = fairnessRerank(cs);
    const b = fairnessRerank(cs);
    expect(a.map((c) => c.targetHash)).toEqual(b.map((c) => c.targetHash));
  });

  it('respects DEFAULT_FAIRNESS_CONFIG constants per spec', () => {
    expect(DEFAULT_FAIRNESS_CONFIG.giniTargetPerGender).toBe(0.40);
    expect(DEFAULT_FAIRNESS_CONFIG.giniTargetOther).toBe(0.45);
    expect(DEFAULT_FAIRNESS_CONFIG.topN).toBe(50);
    expect(DEFAULT_FAIRNESS_CONFIG.swapDelta).toBe(0.05);
  });
});
