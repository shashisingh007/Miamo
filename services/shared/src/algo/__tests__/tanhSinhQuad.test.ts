import { describe, it, expect } from 'vitest';
import { tanhSinhQuad } from '../tanhSinhQuad';

describe('tanhSinhQuad', () => {
  it('integrates constant', () => {
    expect(tanhSinhQuad((_x) => 1, 0, 1)).toBeCloseTo(1, 10);
  });

  it('integrates linear', () => {
    expect(tanhSinhQuad((x) => x, 0, 1)).toBeCloseTo(0.5, 10);
  });

  it('integrates quadratic', () => {
    expect(tanhSinhQuad((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 10);
  });

  it('integrates cubic', () => {
    expect(tanhSinhQuad((x) => x * x * x, 0, 2)).toBeCloseTo(4, 9);
  });

  it('integrates sin over [0,π]', () => {
    expect(tanhSinhQuad(Math.sin, 0, Math.PI)).toBeCloseTo(2, 9);
  });

  it('integrates exp over [0,1]', () => {
    expect(tanhSinhQuad(Math.exp, 0, 1)).toBeCloseTo(Math.E - 1, 9);
  });

  it('integrates 4/(1+x²) => π', () => {
    expect(tanhSinhQuad((x) => 4 / (1 + x * x), 0, 1)).toBeCloseTo(Math.PI, 9);
  });

  it('handles endpoint singularity log(x)', () => {
    // ∫_0^1 log(x) dx = -1
    expect(tanhSinhQuad(Math.log, 0, 1, 8)).toBeCloseTo(-1, 6);
  });

  it('handles 1/sqrt(x) singularity', () => {
    // ∫_0^1 1/sqrt(x) dx = 2
    expect(tanhSinhQuad((x) => (x === 0 ? 0 : 1 / Math.sqrt(x)), 0, 1, 8)).toBeCloseTo(2, 6);
  });

  it('throws on a>=b', () => {
    expect(() => tanhSinhQuad((x) => x, 1, 1)).toThrow();
    expect(() => tanhSinhQuad((x) => x, 2, 1)).toThrow();
  });

  it('throws on infinite endpoints', () => {
    expect(() => tanhSinhQuad((x) => x, 0, Infinity)).toThrow();
  });

  it('throws on bad level', () => {
    expect(() => tanhSinhQuad((x) => x, 0, 1, 0)).toThrow();
  });

  it('throws on bad tol', () => {
    expect(() => tanhSinhQuad((x) => x, 0, 1, 5, 0)).toThrow();
  });

  it('throws on non-function', () => {
    expect(() => tanhSinhQuad('hi' as any, 0, 1)).toThrow();
  });

  it('symmetric integrand on symmetric domain', () => {
    expect(tanhSinhQuad((x) => x * x, -1, 1)).toBeCloseTo(2 / 3, 9);
  });
});
