import { describe, it, expect } from 'vitest';
import { nfaToDfa, dfaAccepts, nfaToDfaSubset } from '../nfaToDfaSubset';

// NFA for (a|b)*abb
function nfaABStarABB() {
  // 5 states: 0 -> ε to 1, 1 -- a/b loop -- back via ε, then 1 -a-> 2 -b-> 3 -b-> 4 (accept)
  // Simplification: just use minimal NFA literally.
  return {
    start: 0,
    accept: new Set([3]),
    transitions: [
      [['a', 0] as [string, number], ['b', 0], ['a', 1]],
      [['b', 2] as [string, number]],
      [['b', 3] as [string, number]],
      [],
    ],
  };
}

describe('nfaToDfaSubset', () => {
  it('factory exposes both', () => {
    const api = nfaToDfaSubset();
    expect(typeof api.nfaToDfa).toBe('function');
    expect(typeof api.dfaAccepts).toBe('function');
  });

  it('single-state accept-empty NFA', () => {
    const dfa = nfaToDfa({ start: 0, accept: new Set([0]), transitions: [[]] });
    expect(dfaAccepts(dfa, [])).toBe(true);
    expect(dfaAccepts(dfa, ['x'])).toBe(false);
  });

  it('accepts (a|b)*abb pattern', () => {
    const dfa = nfaToDfa(nfaABStarABB());
    expect(dfaAccepts(dfa, ['a', 'b', 'b'])).toBe(true);
    expect(dfaAccepts(dfa, ['a', 'a', 'b', 'b'])).toBe(true);
    expect(dfaAccepts(dfa, ['b', 'a', 'b', 'b'])).toBe(true);
  });

  it('rejects strings without abb suffix', () => {
    const dfa = nfaToDfa(nfaABStarABB());
    expect(dfaAccepts(dfa, [])).toBe(false);
    expect(dfaAccepts(dfa, ['a', 'b'])).toBe(false);
    expect(dfaAccepts(dfa, ['a', 'b', 'a'])).toBe(false);
  });

  it('handles epsilon transitions', () => {
    // 0 -ε-> 1 -a-> 2 (accept)
    const dfa = nfaToDfa({
      start: 0,
      accept: new Set([2]),
      transitions: [[['', 1]], [['a', 2]], []],
    });
    expect(dfaAccepts(dfa, ['a'])).toBe(true);
    expect(dfaAccepts(dfa, [])).toBe(false);
  });

  it('start state set includes epsilon closure', () => {
    const dfa = nfaToDfa({
      start: 0,
      accept: new Set([2]),
      transitions: [[['', 1], ['', 2]], [], []],
    });
    expect(dfa.stateSets[dfa.start]).toEqual([0, 1, 2]);
    expect(dfa.accept.has(dfa.start)).toBe(true);
  });

  it('returns DFA transitions as Maps', () => {
    const dfa = nfaToDfa({ start: 0, accept: new Set([1]), transitions: [[['a', 1]], []] });
    expect(dfa.transitions[0].get('a')).toBeDefined();
  });

  it('rejects from missing transition', () => {
    const dfa = nfaToDfa({ start: 0, accept: new Set([1]), transitions: [[['a', 1]], []] });
    expect(dfaAccepts(dfa, ['b'])).toBe(false);
  });

  it('throws on bad inputs', () => {
    expect(() => nfaToDfa(null as any)).toThrow();
    expect(() => nfaToDfa({ start: 0, accept: new Set(), transitions: null as any })).toThrow();
    const dfa = nfaToDfa({ start: 0, accept: new Set([0]), transitions: [[]] });
    expect(() => dfaAccepts(dfa, null as any)).toThrow();
  });

  it('two equivalent NFA states collapse to one DFA state', () => {
    // 0 -a-> 1, 0 -a-> 2; both 1 and 2 are accept.
    const dfa = nfaToDfa({
      start: 0,
      accept: new Set([1, 2]),
      transitions: [[['a', 1], ['a', 2]], [], []],
    });
    expect(dfa.stateSets.length).toBe(2);
    expect(dfaAccepts(dfa, ['a'])).toBe(true);
  });
});
