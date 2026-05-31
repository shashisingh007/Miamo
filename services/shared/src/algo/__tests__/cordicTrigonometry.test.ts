import { describe, it, expect } from 'vitest';
import { cordicSinCos, cordicAtan2, cordicTrigonometry } from '../cordicTrigonometry';

const EPS = 1e-9;

describe('cordicTrigonometry', () => {
  it('factory exposes both', () => {
    const api = cordicTrigonometry();
    expect(typeof api.cordicSinCos).toBe('function');
    expect(typeof api.cordicAtan2).toBe('function');
  });

  it('sin/cos at 0', () => {
    const r = cordicSinCos(0);
    expect(Math.abs(r.sin)).toBeLessThan(EPS);
    expect(Math.abs(r.cos - 1)).toBeLessThan(EPS);
  });

  it('sin/cos at pi/2', () => {
    const r = cordicSinCos(Math.PI / 2);
    expect(Math.abs(r.sin - 1)).toBeLessThan(1e-7);
    expect(Math.abs(r.cos)).toBeLessThan(1e-7);
  });

  it('sin/cos at pi', () => {
    const r = cordicSinCos(Math.PI);
    expect(Math.abs(r.sin)).toBeLessThan(1e-7);
    expect(Math.abs(r.cos + 1)).toBeLessThan(1e-7);
  });

  it('matches Math.sin/cos across angles', () => {
    for (let k = -10; k <= 10; k += 1) {
      const a = (k * Math.PI) / 7;
      const r = cordicSinCos(a);
      expect(Math.abs(r.sin - Math.sin(a))).toBeLessThan(1e-7);
      expect(Math.abs(r.cos - Math.cos(a))).toBeLessThan(1e-7);
    }
  });

  it('atan2(0,0) is 0', () => {
    expect(cordicAtan2(0, 0)).toBe(0);
  });

  it('atan2(1,1) ≈ pi/4', () => {
    expect(Math.abs(cordicAtan2(1, 1) - Math.PI / 4)).toBeLessThan(1e-7);
  });

  it('atan2(1,0) ≈ pi/2', () => {
    expect(Math.abs(cordicAtan2(1, 0) - Math.PI / 2)).toBeLessThan(1e-7);
  });

  it('atan2(-1,-1) ≈ -3pi/4', () => {
    expect(Math.abs(cordicAtan2(-1, -1) - (-3 * Math.PI) / 4)).toBeLessThan(1e-7);
  });

  it('matches Math.atan2 across quadrants', () => {
    const pts: [number, number][] = [
      [1, 2], [-1, 2], [-1, -2], [1, -2], [3, 4], [-3, 4], [-3, -4], [3, -4],
    ];
    for (const [y, x] of pts) {
      expect(Math.abs(cordicAtan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-7);
    }
  });

  it('throws on non-finite', () => {
    expect(() => cordicSinCos(NaN)).toThrow();
    expect(() => cordicSinCos(Infinity)).toThrow();
    expect(() => cordicAtan2(NaN, 1)).toThrow();
    expect(() => cordicAtan2(1, Infinity)).toThrow();
    expect(() => cordicAtan2('1' as any, 1)).toThrow();
  });
});
