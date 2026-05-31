import { describe, it, expect } from 'vitest';
import { earleyAccepts, EarleyGrammar } from '../earleyParser';

// Balanced parens: S -> ( S ) S | ε
const parens: EarleyGrammar = {
  start: 'S',
  productions: [
    { lhs: 'S', rhs: ['(', 'S', ')', 'S'] },
    { lhs: 'S', rhs: [] },
  ],
};

// Ambiguous additive: E -> E + E | n
const expr: EarleyGrammar = {
  start: 'E',
  productions: [
    { lhs: 'E', rhs: ['E', '+', 'E'] },
    { lhs: 'E', rhs: ['n'] },
  ],
};

describe('earleyAccepts', () => {
  it('parens empty', () => {
    expect(earleyAccepts(parens, [])).toBe(true);
  });

  it('parens ()', () => {
    expect(earleyAccepts(parens, ['(', ')'])).toBe(true);
  });

  it('parens (())', () => {
    expect(earleyAccepts(parens, ['(', '(', ')', ')'])).toBe(true);
  });

  it('parens ()()', () => {
    expect(earleyAccepts(parens, ['(', ')', '(', ')'])).toBe(true);
  });

  it('parens unbalanced', () => {
    expect(earleyAccepts(parens, ['(', '(', ')'])).toBe(false);
  });

  it('parens reversed rejected', () => {
    expect(earleyAccepts(parens, [')', '('])).toBe(false);
  });

  it('expr n', () => {
    expect(earleyAccepts(expr, ['n'])).toBe(true);
  });

  it('expr n+n', () => {
    expect(earleyAccepts(expr, ['n', '+', 'n'])).toBe(true);
  });

  it('expr n+n+n (ambiguous still accepted)', () => {
    expect(earleyAccepts(expr, ['n', '+', 'n', '+', 'n'])).toBe(true);
  });

  it('expr +n rejected', () => {
    expect(earleyAccepts(expr, ['+', 'n'])).toBe(false);
  });

  it('expr unknown token rejected', () => {
    expect(earleyAccepts(expr, ['n', '*', 'n'])).toBe(false);
  });
});
