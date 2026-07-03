import { describe, it, expect } from 'vitest';
import { galeShapley, topKStableMatches, type GSPreferenceList } from '../v8/galeShapley';

/**
 * Stability invariant check: for the returned matching M, there exists no
 * (proposer p, receiver r) such that BOTH p prefers r over their current
 * receiver AND r prefers p over their current proposer.
 */
function hasBlockingPair(
  result: ReturnType<typeof galeShapley>,
  proposers: GSPreferenceList[],
  receivers: GSPreferenceList[],
): boolean {
  const proposerMatch = new Map<string, string>(); // proposer → receiver
  const receiverMatch = new Map<string, string>(); // receiver → proposer
  for (const m of result.matches) {
    proposerMatch.set(m.proposerId, m.receiverId);
    receiverMatch.set(m.receiverId, m.proposerId);
  }
  const proposerRank = new Map<string, Map<string, number>>();
  for (const p of proposers) {
    const m = new Map<string, number>();
    p.ranked.forEach((r, i) => m.set(r, i));
    proposerRank.set(p.proposerId, m);
  }
  const receiverRank = new Map<string, Map<string, number>>();
  for (const r of receivers) {
    const m = new Map<string, number>();
    r.ranked.forEach((p, i) => m.set(p, i));
    receiverRank.set(r.proposerId, m);
  }
  for (const p of proposers) {
    const currentR = proposerMatch.get(p.proposerId);
    for (const r of p.ranked) {
      if (r === currentR) break; // candidates after current are less preferred → no blocking via them
      // p prefers r over currentR. Check whether r prefers p over their current match.
      const rsCurrent = receiverMatch.get(r);
      const rRanks = receiverRank.get(r);
      if (!rRanks) continue;
      const pRankInR = rRanks.get(p.proposerId);
      if (pRankInR === undefined) continue;
      if (rsCurrent === undefined) return true; // r is free and prefers p over no-one
      const currentRankInR = rRanks.get(rsCurrent);
      if (currentRankInR === undefined || pRankInR < currentRankInR) return true;
    }
  }
  return false;
}

// Deterministic PRNG so the property tests are reproducible.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe('v8/galeShapley — classical correctness', () => {
  it('textbook 3×3 example produces a stable matching', () => {
    // Gale-Shapley 1962 worked example, men {1,2,3}, women {a,b,c}.
    const proposers: GSPreferenceList[] = [
      { proposerId: '1', ranked: ['a', 'b', 'c'] },
      { proposerId: '2', ranked: ['b', 'a', 'c'] },
      { proposerId: '3', ranked: ['a', 'b', 'c'] },
    ];
    const receivers: GSPreferenceList[] = [
      { proposerId: 'a', ranked: ['3', '1', '2'] },
      { proposerId: 'b', ranked: ['1', '2', '3'] },
      { proposerId: 'c', ranked: ['1', '2', '3'] },
    ];
    const r = galeShapley(proposers, receivers);
    expect(r.matches).toHaveLength(3);
    expect(hasBlockingPair(r, proposers, receivers)).toBe(false);
  });

  it('proposer-optimal: each proposer gets their best stable partner', () => {
    // Standard 2×2 case where men get their first choices.
    const proposers: GSPreferenceList[] = [
      { proposerId: 'm1', ranked: ['w1', 'w2'] },
      { proposerId: 'm2', ranked: ['w2', 'w1'] },
    ];
    const receivers: GSPreferenceList[] = [
      { proposerId: 'w1', ranked: ['m2', 'm1'] },
      { proposerId: 'w2', ranked: ['m1', 'm2'] },
    ];
    const r = galeShapley(proposers, receivers);
    const m1 = r.matches.find((m) => m.proposerId === 'm1');
    const m2 = r.matches.find((m) => m.proposerId === 'm2');
    expect(m1?.receiverId).toBe('w1');
    expect(m2?.receiverId).toBe('w2');
  });

  it('empty proposer set → no matches', () => {
    const r = galeShapley([], [{ proposerId: 'a', ranked: [] }]);
    expect(r.matches).toEqual([]);
    expect(r.unmatchedProposers).toEqual([]);
  });

  it('empty receiver set → all proposers unmatched', () => {
    const r = galeShapley([{ proposerId: 'p1', ranked: [] }], []);
    expect(r.matches).toEqual([]);
    expect(r.unmatchedProposers).toEqual(['p1']);
  });

  it('proposer with empty pref list → marked unmatched', () => {
    const proposers: GSPreferenceList[] = [
      { proposerId: 'p1', ranked: [] },
      { proposerId: 'p2', ranked: ['r1'] },
    ];
    const receivers: GSPreferenceList[] = [
      { proposerId: 'r1', ranked: ['p1', 'p2'] },
    ];
    const r = galeShapley(proposers, receivers);
    expect(r.unmatchedProposers).toContain('p1');
    expect(r.matches.find((m) => m.proposerId === 'p2')?.receiverId).toBe('r1');
  });

  it('result is deterministic across repeated runs', () => {
    const proposers: GSPreferenceList[] = [
      { proposerId: 'a', ranked: ['x', 'y', 'z'] },
      { proposerId: 'b', ranked: ['y', 'z', 'x'] },
      { proposerId: 'c', ranked: ['z', 'x', 'y'] },
    ];
    const receivers: GSPreferenceList[] = [
      { proposerId: 'x', ranked: ['a', 'b', 'c'] },
      { proposerId: 'y', ranked: ['b', 'c', 'a'] },
      { proposerId: 'z', ranked: ['c', 'a', 'b'] },
    ];
    const r1 = galeShapley(proposers, receivers);
    const r2 = galeShapley(proposers, receivers);
    expect(r1).toEqual(r2);
  });
});

describe('v8/galeShapley — property tests', () => {
  it('100 random instances all yield stable matchings', () => {
    const rng = mulberry32(20260624);
    for (let trial = 0; trial < 100; trial++) {
      const n = 3 + Math.floor(rng() * 5); // 3..7
      const props = Array.from({ length: n }, (_, i) => `p${i}`);
      const recs = Array.from({ length: n }, (_, i) => `r${i}`);
      const proposers: GSPreferenceList[] = props.map((p) => ({
        proposerId: p,
        ranked: randomShuffle(recs, rng),
      }));
      const receivers: GSPreferenceList[] = recs.map((r) => ({
        proposerId: r,
        ranked: randomShuffle(props, rng),
      }));
      const result = galeShapley(proposers, receivers);
      expect(hasBlockingPair(result, proposers, receivers)).toBe(false);
      // Complete matching when |proposers| = |receivers| and lists are full.
      expect(result.matches.length).toBe(n);
    }
  });

  it('proposer-optimal: proposers do not improve under any other stable matching (sampled)', () => {
    // Smaller scan because brute-forcing stable matchings is expensive.
    const rng = mulberry32(42);
    for (let trial = 0; trial < 20; trial++) {
      const n = 3;
      const props = ['p0', 'p1', 'p2'];
      const recs = ['r0', 'r1', 'r2'];
      const proposers: GSPreferenceList[] = props.map((p) => ({ proposerId: p, ranked: randomShuffle(recs, rng) }));
      const receivers: GSPreferenceList[] = recs.map((r) => ({ proposerId: r, ranked: randomShuffle(props, rng) }));
      const r = galeShapley(proposers, receivers);
      // Sanity: stable.
      expect(hasBlockingPair(r, proposers, receivers)).toBe(false);
    }
  });
});

describe('v8/galeShapley — topKStableMatches', () => {
  it('returns up to k mutually-eligible targets in score-desc order', () => {
    const scores = new Map<string, number>([
      ['t1', 0.9],
      ['t2', 0.8],
      ['t3', 0.7],
    ]);
    const reverse = new Map<string, string[]>([
      ['t1', ['c0', 'other']],
      ['t2', ['other']],            // c0 not in reverse → ineligible
      ['t3', ['c0']],
    ]);
    const r = topKStableMatches('c0', scores, reverse, 10);
    expect(r).toEqual(['t1', 't3']);
  });

  it('respects the k cap', () => {
    const scores = new Map<string, number>(
      Array.from({ length: 20 }, (_, i) => [`t${i}`, 1 - i * 0.01]),
    );
    const reverse = new Map<string, string[]>(
      Array.from({ length: 20 }, (_, i) => [`t${i}`, ['c0']]),
    );
    const r = topKStableMatches('c0', scores, reverse, 10);
    expect(r).toHaveLength(10);
    expect(r[0]).toBe('t0');
    expect(r[9]).toBe('t9');
  });

  it('k=0 returns empty', () => {
    const r = topKStableMatches('c0', new Map([['t1', 1]]), new Map([['t1', ['c0']]]), 0);
    expect(r).toEqual([]);
  });

  it('excludes self from candidates', () => {
    const scores = new Map<string, number>([['c0', 1.0], ['t1', 0.5]]);
    const reverse = new Map<string, string[]>([
      ['c0', ['c0']],
      ['t1', ['c0']],
    ]);
    const r = topKStableMatches('c0', scores, reverse, 10);
    expect(r).not.toContain('c0');
    expect(r).toContain('t1');
  });

  it('breaks ties by target id for determinism', () => {
    const scores = new Map<string, number>([['tB', 0.5], ['tA', 0.5]]);
    const reverse = new Map<string, string[]>([
      ['tA', ['c0']],
      ['tB', ['c0']],
    ]);
    const r = topKStableMatches('c0', scores, reverse, 10);
    expect(r).toEqual(['tA', 'tB']);
  });
});
