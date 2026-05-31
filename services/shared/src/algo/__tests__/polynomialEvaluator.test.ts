import { describe, it, expect } from 'vitest';
import {
  evaluatePolynomial,
  differentiatePolynomial,
  integratePolynomial,
  addPolynomials,
  multiplyPolynomials,
} from '../polynomialEvaluator';

describe('evaluatePolynomial', () => {
  it('empty => 0', () => {
    expect(evaluatePolynomial([], 3)).toBe(0);
  });
  it('constant', () => {
    expect(evaluatePolynomial([5], 100)).toBe(5);
  });
  it('linear 2 + 3x at x=4 => 14', () => {
    expect(evaluatePolynomial([2, 3], 4)).toBe(14);
  });
  it('quadratic 1 + 2x + 3x^2 at x=2 => 17', () => {
    expect(evaluatePolynomial([1, 2, 3], 2)).toBe(17);
  });
  it('handles x=0', () => {
    expect(evaluatePolynomial([7, 9, 11], 0)).toBe(7);
  });
  it('negative x', () => {
    expect(evaluatePolynomial([1, 1, 1], -1)).toBe(1);
  });
});

describe('differentiatePolynomial', () => {
  it('constant => empty', () => {
    expect(differentiatePolynomial([5])).toEqual([]);
  });
  it('empty => empty', () => {
    expect(differentiatePolynomial([])).toEqual([]);
  });
  it('1 + 2x + 3x^2 => 2 + 6x', () => {
    expect(differentiatePolynomial([1, 2, 3])).toEqual([2, 6]);
  });
  it('5x^3 => 15x^2', () => {
    expect(differentiatePolynomial([0, 0, 0, 5])).toEqual([0, 0, 15]);
  });
});

describe('integratePolynomial', () => {
  it('constant 0 => [0]', () => {
    expect(integratePolynomial([])).toEqual([0]);
  });
  it('integrates 1 + 2x => x + x^2 (+C)', () => {
    expect(integratePolynomial([1, 2])).toEqual([0, 1, 1]);
  });
  it('uses constant', () => {
    expect(integratePolynomial([1], 7)).toEqual([7, 1]);
  });
});

describe('addPolynomials', () => {
  it('empty + empty', () => {
    expect(addPolynomials([], [])).toEqual([]);
  });
  it('different lengths', () => {
    expect(addPolynomials([1, 2], [3, 4, 5])).toEqual([4, 6, 5]);
  });
  it('cancels to zero polynomial', () => {
    expect(addPolynomials([1, 2], [-1, -2])).toEqual([0]);
  });
  it('strips trailing zeros', () => {
    expect(addPolynomials([1, 2, 3], [0, 0, -3])).toEqual([1, 2]);
  });
});

describe('multiplyPolynomials', () => {
  it('empty * any => empty', () => {
    expect(multiplyPolynomials([], [1, 2])).toEqual([]);
  });
  it('(1+x)(1+x) => 1 + 2x + x^2', () => {
    expect(multiplyPolynomials([1, 1], [1, 1])).toEqual([1, 2, 1]);
  });
  it('(2+3x)(1+4x) => 2 + 11x + 12x^2', () => {
    expect(multiplyPolynomials([2, 3], [1, 4])).toEqual([2, 11, 12]);
  });
  it('multiply by constant', () => {
    expect(multiplyPolynomials([3], [1, 2, 3])).toEqual([3, 6, 9]);
  });
});
