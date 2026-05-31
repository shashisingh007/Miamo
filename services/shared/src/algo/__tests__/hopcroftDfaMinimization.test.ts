import { describe, it, expect } from 'vitest';
import { hopcroftMinimize, hopAccepts, HopDfa } from '../hopcroftDfaMinimization';

function evenA(): HopDfa {
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

function withEquivalents(): HopDfa {
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

describe('hopcroftMinimize', () => {
  it('already minimal', () => {
    const m = hopcroftMinimize(evenA());
    expect(m.states).toBe(2);
  });

  it('collapses equivalents', () => {
    const m = hopcroftMinimize(withEquivalents());
    expect(m.states).toBe(2);
  });

  it('preserves language', () => {
    const orig = withEquivalents();
    const m = hopcroftMinimize(orig);
    for (const s of ['', 'a', 'b', 'ab', 'ba', 'aab', 'aba', 'aabba', 'bbab']) {
      expect(hopAccepts(m, s.split(''))).toBe(hopAccepts(orig, s.split('')));
    }
  });

  it('drops unreachable states', () => {
    const dfa: HopDfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([2]),
      transitions: {
        0: { a: 0 },
        1: { a: 2 },
        2: { a: 2 },
      },
    };
    const m = hopcroftMinimize(dfa);
    expect(m.states).toBe(1);
    expect(m.accepts.size).toBe(0);
  });

  it('all accepting collapses', () => {
    const dfa: HopDfa = {
      states: 3,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([0, 1, 2]),
      transitions: { 0: { a: 1 }, 1: { a: 2 }, 2: { a: 0 } },
    };
    const m = hopcroftMinimize(dfa);
    expect(m.states).toBe(1);
    expect(m.accepts.size).toBe(1);
  });

  it('start in valid range', () => {
    const m = hopcroftMinimize(withEquivalents());
    expect(m.start).toBeGreaterThanOrEqual(0);
    expect(m.start).toBeLessThan(m.states);
  });

  it('language sample on evenA', () => {
    const m = hopcroftMinimize(evenA());
    expect(hopAccepts(m, [])).toBe(true);
    expect(hopAccepts(m, ['a', 'a'])).toBe(true);
    expect(hopAccepts(m, ['a'])).toBe(false);
  });

  it('idempotent', () => {
    const m1 = hopcroftMinimize(withEquivalents());
    const m2 = hopcroftMinimize(m1);
    expect(m2.states).toBe(m1.states);
  });

  it('single state preserved', () => {
    const dfa: HopDfa = {
      states: 1,
      alphabet: ['a'],
      start: 0,
      accepts: new Set([0]),
      transitions: { 0: { a: 0 } },
    };
    const m = hopcroftMinimize(dfa);
    expect(m.states).toBe(1);
    expect(hopAccepts(m, ['a'])).toBe(true);
  });

  it('partial transitions handled', () => {
    const dfa: HopDfa = {
      states: 2,
      alphabet: ['a', 'b'],
      start: 0,
      accepts: new Set([1]),
      transitions: { 0: { a: 1 }, 1: {} },
    };
    const m = hopcroftMinimize(dfa);
    expect(hopAccepts(m, ['a'])).toBe(true);
    expect(hopAccepts(m, ['b'])).toBe(false);
  });
});
