import { describe, it, expect } from 'vitest';
import { ImplicitTreap } from '../treapImplicitSequence';

describe('ImplicitTreap', () => {
  it('empty', () => {
    const t = new ImplicitTreap();
    expect(t.size()).toBe(0);
    expect(t.toArray()).toEqual([]);
  });

  it('append', () => {
    const t = new ImplicitTreap();
    for (let i = 0; i < 5; i++) t.insertAt(i, i);
    expect(t.toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(t.size()).toBe(5);
  });

  it('prepend', () => {
    const t = new ImplicitTreap();
    for (let i = 0; i < 5; i++) t.insertAt(0, i);
    expect(t.toArray()).toEqual([4, 3, 2, 1, 0]);
  });

  it('insert middle', () => {
    const t = new ImplicitTreap();
    [10, 20, 30].forEach((v, i) => t.insertAt(i, v));
    t.insertAt(1, 99);
    expect(t.toArray()).toEqual([10, 99, 20, 30]);
  });

  it('get by index', () => {
    const t = new ImplicitTreap();
    [5, 6, 7, 8].forEach((v, i) => t.insertAt(i, v));
    expect(t.get(0)).toBe(5);
    expect(t.get(3)).toBe(8);
  });

  it('eraseAt', () => {
    const t = new ImplicitTreap();
    [1, 2, 3, 4].forEach((v, i) => t.insertAt(i, v));
    expect(t.eraseAt(1)).toBe(2);
    expect(t.toArray()).toEqual([1, 3, 4]);
  });

  it('out-of-bounds insert throws', () => {
    const t = new ImplicitTreap();
    expect(() => t.insertAt(1, 0)).toThrow();
  });

  it('out-of-bounds get throws', () => {
    const t = new ImplicitTreap();
    expect(() => t.get(0)).toThrow();
  });

  it('out-of-bounds erase throws', () => {
    const t = new ImplicitTreap();
    expect(() => t.eraseAt(0)).toThrow();
  });

  it('matches array under random ops', () => {
    const t = new ImplicitTreap(42);
    const a: number[] = [];
    let s = 1;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    for (let i = 0; i < 200; i++) {
      const op = rand();
      if (op < 0.6 || a.length === 0) {
        const idx = Math.floor(rand() * (a.length + 1));
        t.insertAt(idx, i);
        a.splice(idx, 0, i);
      } else {
        const idx = Math.floor(rand() * a.length);
        expect(t.eraseAt(idx)).toBe(a[idx]);
        a.splice(idx, 1);
      }
    }
    expect(t.toArray()).toEqual(a);
  });
});
