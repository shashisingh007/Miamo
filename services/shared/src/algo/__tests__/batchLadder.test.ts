import { describe, it, expect } from 'vitest';
import {
  nextBatch,
  computeMomentum,
  skipBreathe,
  INITIAL_BATCH_STATE,
} from '../batchLadder';

describe('batchLadder.nextBatch', () => {
  const mkCandidates = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

  it('returns first 10 by default', () => {
    const out = nextBatch({
      candidates: mkCandidates(25),
      state: INITIAL_BATCH_STATE,
      rand: () => 0.5,
    });
    expect(out.batch).toEqual(mkCandidates(10));
    expect(out.nextState.cursor).toBe(10);
    expect(out.nextState.seq).toBe(1);
    expect(out.exhausted).toBe(false);
  });

  it('marks exhausted when cursor reaches the end', () => {
    const out = nextBatch({
      candidates: mkCandidates(8),
      state: INITIAL_BATCH_STATE,
      rand: () => 0.5,
    });
    expect(out.batch).toHaveLength(8);
    expect(out.exhausted).toBe(true);
  });

  it('breatheMs sits inside [1800, 3200]', () => {
    for (let i = 0; i < 20; i++) {
      const out = nextBatch({
        candidates: mkCandidates(50),
        state: { ...INITIAL_BATCH_STATE, momentum: i / 20 },
        rand: Math.random,
      });
      expect(out.breatheMs).toBeGreaterThanOrEqual(1800);
      expect(out.breatheMs).toBeLessThanOrEqual(3200);
    }
  });

  it('high momentum → shorter breath than low momentum', () => {
    const lo = nextBatch({
      candidates: mkCandidates(50),
      state: { ...INITIAL_BATCH_STATE, momentum: 0 },
      rand: () => 0.5, // jitter = 0
    });
    const hi = nextBatch({
      candidates: mkCandidates(50),
      state: { ...INITIAL_BATCH_STATE, momentum: 1 },
      rand: () => 0.5,
    });
    expect(hi.breatheMs).toBeLessThan(lo.breatheMs);
  });

  it('subsequent calls advance cursor through the candidate list', () => {
    const cands = mkCandidates(25);
    const r1 = nextBatch({ candidates: cands, state: INITIAL_BATCH_STATE, rand: () => 0.5 });
    const r2 = nextBatch({ candidates: cands, state: r1.nextState, rand: () => 0.5 });
    const r3 = nextBatch({ candidates: cands, state: r2.nextState, rand: () => 0.5 });
    expect(r1.batch[0]).toBe('c0');
    expect(r2.batch[0]).toBe('c10');
    expect(r3.batch[0]).toBe('c20');
    expect(r3.batch).toHaveLength(5);
    expect(r3.exhausted).toBe(true);
  });

  it('skipBreathe zeroes the wait', () => {
    const out = nextBatch({
      candidates: mkCandidates(20),
      state: INITIAL_BATCH_STATE,
    });
    expect(skipBreathe(out).breatheMs).toBe(0);
  });

  it('clamps k', () => {
    expect(
      nextBatch({ candidates: mkCandidates(50), state: INITIAL_BATCH_STATE, k: 0 }).batch,
    ).toHaveLength(1);
    expect(
      nextBatch({ candidates: mkCandidates(200), state: INITIAL_BATCH_STATE, k: 999 }).batch,
    ).toHaveLength(50);
  });
});

describe('batchLadder.computeMomentum', () => {
  it('returns 0..1', () => {
    const m1 = computeMomentum({ clicksPerMin: 0, scrollsPerMin: 0, dwellsOver800: 0 });
    const m2 = computeMomentum({ clicksPerMin: 999, scrollsPerMin: 999, dwellsOver800: 999 });
    expect(m1).toBe(0);
    expect(m2).toBe(1);
  });

  it('monotone in clicks', () => {
    const a = computeMomentum({ clicksPerMin: 5,  scrollsPerMin: 0, dwellsOver800: 0 });
    const b = computeMomentum({ clicksPerMin: 25, scrollsPerMin: 0, dwellsOver800: 0 });
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
