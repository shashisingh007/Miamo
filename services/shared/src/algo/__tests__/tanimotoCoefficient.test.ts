import { describe, it, expect } from 'vitest';
import { tanimotoCoefficient, tanimotoDistance } from '../tanimotoCoefficient';

describe('tanimotoCoefficient', () => {
  it('identical => 1', () => {
    expect(tanimotoCoefficient([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
  });

  it('orthogonal => 0', () => {
    expect(tanimotoCoefficient([1, 0], [0, 1])).toBeCloseTo(0, 12);
  });

  it('matches manual calc', () => {
    const a = [1, 1, 0];
    const b = [1, 0, 1];
    // dot=1, |a|^2=2, |b|^2=2 => 1/(2+2-1)=1/3
    expect(tanimotoCoefficient(a, b)).toBeCloseTo(1 / 3, 12);
  });

  it('symmetric', () => {
    expect(tanimotoCoefficient([1, 2], [3, 4])).toBeCloseTo(
      tanimotoCoefficient([3, 4], [1, 2]),
      12
    );
  });

  it('throws on length mismatch', () => {
    expect(() => tanimotoCoefficient([1], [1, 2])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => tanimotoCoefficient([], [])).toThrow();
  });

  it('throws on both-zero', () => {
    expect(() => tanimotoCoefficient([0, 0], [0, 0])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => tanimotoCoefficient([NaN], [1])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => tanimotoCoefficient([Infinity], [1])).toThrow();
  });

  it('one-zero side', () => {
    expect(tanimotoCoefficient([0, 0], [1, 1])).toBeCloseTo(0, 12);
  });

  it('distance complementary', () => {
    expect(tanimotoDistance([1, 2], [3, 4])).toBeCloseTo(
      1 - tanimotoCoefficient([1, 2], [3, 4]),
      12
    );
  });

  it('distance identical => 0', () => {
    expect(tanimotoDistance([1, 2], [1, 2])).toBeCloseTo(0, 12);
  });

  it('handles negatives', () => {
    const v = tanimotoCoefficient([1, -1], [1, -1]);
    expect(v).toBeCloseTo(1, 12);
  });

  it('high dim', () => {
    const a = Array.from({ length: 50 }, () => 1);
    const b = Array.from({ length: 50 }, () => 1);
    expect(tanimotoCoefficient(a, b)).toBeCloseTo(1, 12);
  });
});
