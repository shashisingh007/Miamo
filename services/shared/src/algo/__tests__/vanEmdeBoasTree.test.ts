import { describe, it, expect } from 'vitest';
import { vanEmdeBoasTree, VanEmdeBoasTree } from '../vanEmdeBoasTree';

describe('vanEmdeBoasTree', () => {
  it('factory + class', () => {
    expect(vanEmdeBoasTree(16) instanceof VanEmdeBoasTree).toBe(true);
  });

  it('empty min/max null', () => {
    const t = vanEmdeBoasTree(16);
    expect(t.min()).toBeNull();
    expect(t.max()).toBeNull();
    expect(t.has(0)).toBe(false);
  });

  it('insert + has', () => {
    const t = vanEmdeBoasTree(16);
    [3, 7, 1, 12].forEach((v) => t.insert(v));
    [3, 7, 1, 12].forEach((v) => expect(t.has(v)).toBe(true));
    expect(t.has(2)).toBe(false);
  });

  it('min/max', () => {
    const t = vanEmdeBoasTree(16);
    [5, 2, 9, 14, 1].forEach((v) => t.insert(v));
    expect(t.min()).toBe(1);
    expect(t.max()).toBe(14);
  });

  it('successor / predecessor', () => {
    const t = vanEmdeBoasTree(16);
    [1, 4, 9, 12].forEach((v) => t.insert(v));
    expect(t.successor(4)).toBe(9);
    expect(t.successor(0)).toBe(1);
    expect(t.successor(12)).toBeNull();
    expect(t.predecessor(9)).toBe(4);
    expect(t.predecessor(15)).toBe(12);
    expect(t.predecessor(1)).toBeNull();
  });

  it('delete updates structure', () => {
    const t = vanEmdeBoasTree(16);
    [3, 5, 8].forEach((v) => t.insert(v));
    expect(t.delete(5)).toBe(true);
    expect(t.has(5)).toBe(false);
    expect(t.min()).toBe(3);
    expect(t.max()).toBe(8);
  });

  it('delete missing returns false', () => {
    const t = vanEmdeBoasTree(16);
    t.insert(2);
    expect(t.delete(99)).toBe(false);
  });

  it('delete only element', () => {
    const t = vanEmdeBoasTree(16);
    t.insert(7);
    expect(t.delete(7)).toBe(true);
    expect(t.min()).toBeNull();
  });

  it('duplicate insert idempotent', () => {
    const t = vanEmdeBoasTree(16);
    t.insert(5);
    t.insert(5);
    expect(t.min()).toBe(5);
    expect(t.max()).toBe(5);
  });

  it('throws on invalid universe', () => {
    expect(() => vanEmdeBoasTree(1)).toThrow();
    expect(() => vanEmdeBoasTree(0)).toThrow();
  });

  it('throws on out-of-universe insert', () => {
    const t = vanEmdeBoasTree(16);
    expect(() => t.insert(20)).toThrow();
    expect(() => t.insert(-1)).toThrow();
  });

  it('matches set on workload', () => {
    const U = 64;
    const t = vanEmdeBoasTree(U);
    const ref = new Set<number>();
    for (let i = 0; i < 200; i += 1) {
      const v = Math.floor(Math.random() * U);
      if (Math.random() < 0.7) {
        t.insert(v);
        ref.add(v);
      } else {
        const had = ref.has(v);
        expect(t.delete(v)).toBe(had);
        ref.delete(v);
      }
    }
    for (let v = 0; v < U; v += 1) expect(t.has(v)).toBe(ref.has(v));
  });
});
