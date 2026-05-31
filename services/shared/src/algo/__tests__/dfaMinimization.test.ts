import { describe, it, expect } from 'vitest';
import { minimizeDfa, dfaAcceptsString, Dfa } from '../dfaMinimization';

function dfaEvenA(): Dfa {
  // Accepts strings over {a,b} with an even number of a's.
  return {
    states: 2,
    alphabet: ['a', 'b'],
    start: 0,
    accepts: new Set([0]),
    transitions: {
      0: { a: 1, b: 0 },
      1: { a: 0, b: 1 },
    },
  };
}

function dfaWithRedundantStates(): Dfa {
  // States 0,1 both non-accepting & equivalent; states 2,3 both accepting & equivalent.
  // Symbol a flips parity, b keeps.
  return {
    states: 4,
    alphabet: ['a', 'b'],
    start: 0,
    accepts: new Set([2, 3]),
    transitions: {
      0: { a: 2, b: 1 },
      1: { a: 3, b: 0 },
      2: { a: 0, b: 3 },
      3: { a: 1, b: 2 },
    },
  };
}

describe('minimizeDfa', () => {
  it('already minimal', () => {
    const m = minimizeDfa(dfaEvenA());
    expect(m.states).toBe(2);
  });

  it('collapses equivalent states', () => {
    const m = minimizeDfa(dfaWithRedundantStates());
    expect(m.states).toBe(2);
  });

  it('preserves language on small samples', () => {
    const orig = dfaWithRedundantStates();
    const m = minimizeDfa(orig);
    const samples = ['', 'a', 'b', 'aa', 'ab', 'ba', 'aab', 'aba', 'bab', 'abab', 'aaa'].map((s) => s.split(''));
    for (const s of samples) {
      expect(dfaAcceptsString(m, s)).toBe(dfaAcceptsString(orig, s));
    }
  });

  it('drops dead states', () => {
    // State 2 is a non-accepting dead state.
    const dfa: Dfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([1]),
      transitions: {
        0: { a: 1 },
        1: { a: 2 },
        2: { a: 2 },
      },
    };
    const m = minimizeDfa(dfa);
    expect(m.states).toBe(2);
    expect(dfaAcceptsString(m, ['a'])).toBe(true);
    expect(dfaAcceptsString(m, ['a', 'a'])).toBe(false);
  });

  it('start is mapped', () => {
    const m = minimizeDfa(dfaWithRedundantStates());
    expect(m.start).toBeGreaterThanOrEqual(0);
    expect(m.start).toBeLessThan(m.states);
  });

  it('accepts set valid', () => {
    const m = minimizeDfa(dfaWithRedundantStates());
    for (const a of m.accepts) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(m.states);
    }
  });

  it('classOf maps every original state', () => {
    const dfa = dfaWithRedundantStates();
    const m = minimizeDfa(dfa);
    for (let i = 0; i < dfa.states; i++) {
      expect(m.classOf.has(i)).toBe(true);
    }
  });

  it('all-rejecting DFA collapses', () => {
    const dfa: Dfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set(),
      transitions: { 0: { a: 1 }, 1: { a: 2 }, 2: { a: 0 } },
    };
    const m = minimizeDfa(dfa);
    expect(m.accepts.size).toBe(0);
  });

  it('single accepting state preserved', () => {
    const dfa: Dfa = {
      states: 1,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([0]),
      transitions: { 0: { a: 0 } },
    };
    const m = minimizeDfa(dfa);
    expect(m.states).toBe(1);
    expect(dfaAcceptsString(m, ['a', 'a', 'a'])).toBe(true);
  });

  it('dfaAcceptsString rejects missing transition', () => {
    const dfa: Dfa = {
      states: 1,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([0]),
      transitions: { 0: {} },
    };
    expect(dfaAcceptsString(dfa, ['a'])).toBe(false);
  });
});
