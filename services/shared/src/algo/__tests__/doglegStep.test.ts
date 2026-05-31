import { describe, it, expect } from 'vitest';
import { doglegStep } from '../doglegStep';

describe('doglegStep', () => {
  it('throws on empty B', () => {
    expect(() => doglegStep([], [], 1)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => doglegStep([[1, 2]], [1, 2], 1)).toThrow();
  });

  it('throws on g size mismatch', () => {
    expect(() => doglegStep([[1, 0], [0, 1]], [1], 1)).toThrow();
  });

  it('throws on delta<=0', () => {
    expect(() => doglegStep([[1, 0], [0, 1]], [1, 1], 0)).toThrow();
  });

  it('newton step when delta large', () => {
    const r = doglegStep([[1, 0], [0, 1]], [2, 4], 100);
    expect(r.type).toBe('newton');
    expect(r.step[0]).toBeCloseTo(-2, 8);
    expect(r.step[1]).toBeCloseTo(-4, 8);
  });

  it('cauchy when delta tiny', () => {
    const r = doglegStep([[2, 0], [0, 2]], [3, 4], 0.01);
    expect(r.type).toBe('cauchy');
    expect(r.norm).toBeCloseTo(0.01, 8);
  });

  it('dogleg path between', () => {
    const r = doglegStep([[1, 0], [0, 1]], [2, 0], 1);
    expect(['cauchy', 'dogleg', 'newton']).toContain(r.type);
    expect(r.norm).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('non-PD Hessian -> cauchy', () => {
    const r = doglegStep([[-1, 0], [0, -1]], [1, 1], 0.5);
    expect(r.type).toBe('cauchy');
    expect(r.norm).toBeCloseTo(0.5, 8);
  });

  it('zero g newton zero', () => {
    const r = doglegStep([[1, 0], [0, 1]], [0, 0], 1);
    expect(r.type).toBe('newton');
    expect(r.norm).toBe(0);
  });

  it('SPD 3x3 unconstrained', () => {
    const B = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const g = [1, 1, 1];
    const r = doglegStep(B, g, 100);
    expect(r.type).toBe('newton');
    let s = 0;
    for (let i = 0; i < 3; i++) {
      let v = 0;
      for (let j = 0; j < 3; j++) v += B[i][j] * r.step[j];
      v += g[i];
      s += v * v;
    }
    expect(s).toBeLessThan(1e-12);
  });

  it('boundary norm close to delta', () => {
    const r = doglegStep([[1, 0], [0, 1]], [3, 4], 2);
    expect(r.norm).toBeCloseTo(2, 6);
  });

  it('singular B throws', () => {
    expect(() => doglegStep([[1, 1], [1, 1]], [1, 1], 1)).toThrow();
  });

  it('1D case', () => {
    const r = doglegStep([[2]], [4], 100);
    expect(r.type).toBe('newton');
    expect(r.step[0]).toBeCloseTo(-2, 8);
  });

  it('1D constrained', () => {
    const r = doglegStep([[2]], [4], 1);
    expect(r.norm).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.step[0]).toBeLessThan(0);
  });

  it('returns step of correct length', () => {
    const r = doglegStep([[2, 0, 0], [0, 2, 0], [0, 0, 2]], [1, 1, 1], 0.5);
    expect(r.step.length).toBe(3);
  });
});
