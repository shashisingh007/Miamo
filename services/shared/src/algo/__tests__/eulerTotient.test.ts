import { describe, it, expect } from 'vitest';
import { eulerTotient, totientsUpTo } from '../eulerTotient';

describe('eulerTotient', () => {
  it('throws on n < 1', () => {
    expect(() => eulerTotient(0)).toThrow(RangeError);
    expect(() => eulerTotient(-1)).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => eulerTotient(1.5)).toThrow(RangeError);
  });

  it('phi(1) = 1', () => {
    expect(eulerTotient(1)).toBe(1);
  });

  it('phi(p) = p-1 for prime', () => {
    expect(eulerTotient(2)).toBe(1);
    expect(eulerTotient(7)).toBe(6);
    expect(eulerTotient(97)).toBe(96);
  });

  it('phi(9) = 6', () => {
    expect(eulerTotient(9)).toBe(6);
  });

  it('phi(10) = 4', () => {
    expect(eulerTotient(10)).toBe(4);
  });

  it('phi(12) = 4', () => {
    expect(eulerTotient(12)).toBe(4);
  });

  it('phi(36) = 12', () => {
    expect(eulerTotient(36)).toBe(12);
  });

  it('phi(100) = 40', () => {
    expect(eulerTotient(100)).toBe(40);
  });

  it('phi(p*q) = (p-1)(q-1)', () => {
    expect(eulerTotient(3 * 5)).toBe(2 * 4);
    expect(eulerTotient(7 * 11)).toBe(6 * 10);
  });

  it('totientsUpTo(0) => [0]', () => {
    expect(totientsUpTo(0)).toEqual([0]);
  });

  it('totientsUpTo(10) matches', () => {
    const phi = totientsUpTo(10);
    for (let i = 1; i <= 10; i += 1) expect(phi[i]).toBe(eulerTotient(i));
  });

  it('totientsUpTo(20) matches eulerTotient', () => {
    const phi = totientsUpTo(20);
    for (let i = 1; i <= 20; i += 1) expect(phi[i]).toBe(eulerTotient(i));
  });

  it('throws on negative count', () => {
    expect(() => totientsUpTo(-1)).toThrow(RangeError);
  });
});
