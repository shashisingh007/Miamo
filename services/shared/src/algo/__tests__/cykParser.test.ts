import { describe, it, expect } from 'vitest';
import { cykParse, CnfGrammar } from '../cykParser';

// Grammar for balanced 'a^n b^n' style: S -> A B | A C; C -> S B; A -> 'a'; B -> 'b'.
const balanced: CnfGrammar = {
  start: 'S',
  rules: [
    { lhs: 'S', rhs: ['A', 'B'] },
    { lhs: 'S', rhs: ['A', 'C'] },
    { lhs: 'C', rhs: ['S', 'B'] },
    { lhs: 'A', rhs: 'a' },
    { lhs: 'B', rhs: 'b' },
  ],
};

// Simple arithmetic-ish: S -> N P; P -> O N; N -> '1' | '2'; O -> '+'.
const arith: CnfGrammar = {
  start: 'S',
  rules: [
    { lhs: 'S', rhs: ['N', 'P'] },
    { lhs: 'P', rhs: ['O', 'N'] },
    { lhs: 'N', rhs: '1' },
    { lhs: 'N', rhs: '2' },
    { lhs: 'O', rhs: '+' },
  ],
};

describe('cykParse', () => {
  it('accepts ab', () => {
    expect(cykParse(balanced, ['a', 'b'])).toBe(true);
  });

  it('accepts aabb', () => {
    expect(cykParse(balanced, ['a', 'a', 'b', 'b'])).toBe(true);
  });

  it('accepts aaabbb', () => {
    expect(cykParse(balanced, ['a', 'a', 'a', 'b', 'b', 'b'])).toBe(true);
  });

  it('rejects aab', () => {
    expect(cykParse(balanced, ['a', 'a', 'b'])).toBe(false);
  });

  it('rejects ba', () => {
    expect(cykParse(balanced, ['b', 'a'])).toBe(false);
  });

  it('rejects empty', () => {
    expect(cykParse(balanced, [])).toBe(false);
  });

  it('arith 1+2', () => {
    expect(cykParse(arith, ['1', '+', '2'])).toBe(true);
  });

  it('arith rejects 1+', () => {
    expect(cykParse(arith, ['1', '+'])).toBe(false);
  });

  it('rejects unknown terminal', () => {
    expect(cykParse(balanced, ['a', 'z'])).toBe(false);
  });

  it('single terminal accepted when grammar permits', () => {
    const g: CnfGrammar = {
      start: 'S',
      rules: [{ lhs: 'S', rhs: 'x' }],
    };
    expect(cykParse(g, ['x'])).toBe(true);
    expect(cykParse(g, ['y'])).toBe(false);
  });
});
