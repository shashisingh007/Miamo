import { describe, it, expect } from 'vitest';
import { PersistentArray } from '../persistentArray';

describe('PersistentArray', () => {
  it('empty has length 0', () => {
    const a = new PersistentArray<number>();
    expect(a.length).toBe(0);
  });

  it('get on empty => undefined', () => {
    const a = new PersistentArray<number>();
    expect(a.get(0)).toBeUndefined();
  });

  it('set then get', () => {
    const a = new PersistentArray<number>().set(0, 42);
    expect(a.get(0)).toBe(42);
    expect(a.length).toBe(1);
  });

  it('previous version unchanged after set', () => {
    const a = new PersistentArray<number>().set(0, 1);
    const b = a.set(0, 2);
    expect(a.get(0)).toBe(1);
    expect(b.get(0)).toBe(2);
  });

  it('grow length', () => {
    const a = new PersistentArray<number>().set(10, 99);
    expect(a.length).toBe(11);
    expect(a.get(10)).toBe(99);
    expect(a.get(5)).toBeUndefined();
  });

  it('multiple sets', () => {
    let a = new PersistentArray<number>();
    for (let i = 0; i < 20; i += 1) a = a.set(i, i * 10);
    for (let i = 0; i < 20; i += 1) expect(a.get(i)).toBe(i * 10);
    expect(a.length).toBe(20);
  });

  it('immutability across many versions', () => {
    const v0 = new PersistentArray<number>();
    const vA = v0.set(0, 100);
    const vB = vA.set(1, 200);
    const vC = vA.set(1, 999);
    expect(v0.get(0)).toBeUndefined();
    expect(vA.get(0)).toBe(100);
    expect(vA.get(1)).toBeUndefined();
    expect(vB.get(1)).toBe(200);
    expect(vC.get(1)).toBe(999);
    expect(vA.get(1)).toBeUndefined();
  });

  it('throws on negative idx', () => {
    const a = new PersistentArray<number>();
    expect(() => a.set(-1, 1)).toThrow(RangeError);
  });

  it('throws on non-integer idx', () => {
    const a = new PersistentArray<number>();
    expect(() => a.set(1.5, 1)).toThrow(RangeError);
  });

  it('get negative => undefined', () => {
    const a = new PersistentArray<number>().set(0, 1);
    expect(a.get(-1)).toBeUndefined();
  });

  it('handles large index', () => {
    const a = new PersistentArray<number>().set(1000, 'big' as any);
    expect(a.get(1000)).toBe('big');
    expect(a.length).toBe(1001);
  });

  it('overwrite same idx multiple times', () => {
    let a = new PersistentArray<number>();
    a = a.set(5, 1).set(5, 2).set(5, 3);
    expect(a.get(5)).toBe(3);
  });

  it('handles string values', () => {
    const a = new PersistentArray<string>().set(0, 'hello');
    expect(a.get(0)).toBe('hello');
  });
});
