import { describe, it, expect } from 'vitest';
import { brzozowskiMinimize, brzAccepts, BrzDfa } from '../brzozowskiMinimization';

function evenA(): BrzDfa {
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

function withEquivalents(): BrzDfa {
  // 4-state DFA where {0,1} and {2,3} are equivalent.
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

describe('brzozowskiMinimize', () => {
  it('already minimal preserved', () => {
    const m = brzozowskiMinimize(evenA());
    expect(m.states).toBe(2);
  });

  it('collapses equivalents', () => {
    const m = brzozowskiMinimize(withEquivalents());
    expect(m.states).toBe(2);
  });

  it('preserves language', () => {
    const orig = withEquivalents();
    const m = brzozowskiMinimize(orig);
    const samples = ['', 'a', 'b', 'ab', 'ba', 'aab', 'aba', 'bbab', 'aabba'];
    for (const s of samples) {
      expect(brzAccepts(m, s.split(''))).toBe(brzAccepts(orig, s.split('')));
    }
  });

  it('drops dead states (unreachable accepts gone)', () => {
    const dfa: BrzDfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([1]),
      transitions: { 0: { a: 1 }, 1: { a: 2 }, 2: { a: 2 } },
    };
    const m = brzozowskiMinimize(dfa);
    expect(m.states).toBe(2);
    expect(brzAccepts(m, ['a'])).toBe(true);
    expect(brzAccepts(m, ['a', 'a'])).toBe(false);
  });

  it('all-rejecting DFA collapses to no accepts', () => {
    const dfa: BrzDfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set(),
      transitions: { 0: { a: 1 }, 1: { a: 2 }, 2: { a: 0 } },
    };
    const m = brzozowskiMinimize(dfa);
    expect(m.accepts.size).toBe(0);
  });

  it('start in valid range', () => {
    const m = brzozowskiMinimize(withEquivalents());
    expect(m.start).toBeGreaterThanOrEqual(0);
    expect(m.start).toBeLessThan(m.states);
  });

  it('single-state accepting all preserved', () => {
    const dfa: BrzDfa = {
      states: 1,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([0]),
      transitions: { 0: { a: 0 } },
    };
    const m = brzozowskiMinimize(dfa);
    expect(m.states).toBe(1);
    expect(brzAccepts(m, ['a', 'a'])).toBe(true);
  });

  it('empty-input acceptance', () => {
    const m = brzozowskiMinimize(evenA());
    expect(brzAccepts(m, [])).toBe(true);
  });

  it('language sample on evenA', () => {
    const m = brzozowskiMinimize(evenA());
    expect(brzAccepts(m, ['a', 'a'])).toBe(true);
    expect(brzAccepts(m, ['a'])).toBe(false);
  });

  it('idempotent', () => {
    const m1 = brzozowskiMinimize(withEquivalents());
    const m2 = brzozowskiMinimize(m1);
    expect(m2.states).toBe(m1.states);
  });
});
