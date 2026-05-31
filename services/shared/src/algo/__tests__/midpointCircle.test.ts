import { describe, it, expect } from 'vitest';
import { midpointCircle } from '../midpointCircle';

describe('midpointCircle', () => {
  it('radius 0 single pixel', () => {
    expect(midpointCircle(2, 3, 0)).toEqual([{ x: 2, y: 3 }]);
  });

  it('radius 1 yields 4 cardinal pixels', () => {
    const r = midpointCircle(0, 0, 1);
    const set = new Set(r.map((p) => `${p.x},${p.y}`));
    expect(set.has('1,0')).toBe(true);
    expect(set.has('-1,0')).toBe(true);
    expect(set.has('0,1')).toBe(true);
    expect(set.has('0,-1')).toBe(true);
  });

  it('all pixels approximately on circle', () => {
    const R = 7;
    const r = midpointCircle(0, 0, R);
    for (const p of r) {
      const d = Math.hypot(p.x, p.y);
      expect(Math.abs(d - R)).toBeLessThan(1);
    }
  });

  it('center offset shifts all pixels', () => {
    const a = midpointCircle(0, 0, 5);
    const b = midpointCircle(10, -3, 5);
    expect(b.length).toBe(a.length);
    const setB = new Set(b.map((p) => `${p.x},${p.y}`));
    for (const p of a) expect(setB.has(`${p.x + 10},${p.y - 3}`)).toBe(true);
  });

  it('pixels are unique', () => {
    const r = midpointCircle(0, 0, 8);
    const set = new Set(r.map((p) => `${p.x},${p.y}`));
    expect(set.size).toBe(r.length);
  });

  it('symmetric horizontally and vertically', () => {
    const r = midpointCircle(0, 0, 6);
    const set = new Set(r.map((p) => `${p.x},${p.y}`));
    for (const p of r) {
      expect(set.has(`${-p.x},${p.y}`)).toBe(true);
      expect(set.has(`${p.x},${-p.y}`)).toBe(true);
    }
  });

  it('pixel count grows with radius', () => {
    expect(midpointCircle(0, 0, 5).length).toBeLessThan(midpointCircle(0, 0, 20).length);
  });

  it('rejects negative radius', () => {
    expect(() => midpointCircle(0, 0, -1)).toThrow();
  });

  it('rejects non-integer inputs', () => {
    expect(() => midpointCircle(0.5, 0, 3)).toThrow();
    expect(() => midpointCircle(0, 0, 3.5)).toThrow();
  });

  it('contains cardinals at radius', () => {
    const R = 10;
    const r = midpointCircle(0, 0, R);
    const set = new Set(r.map((p) => `${p.x},${p.y}`));
    expect(set.has(`${R},0`)).toBe(true);
    expect(set.has(`${-R},0`)).toBe(true);
    expect(set.has(`0,${R}`)).toBe(true);
    expect(set.has(`0,${-R}`)).toBe(true);
  });

  it('count for radius 1 is exactly 4', () => {
    expect(midpointCircle(0, 0, 1).length).toBe(4);
  });
});
