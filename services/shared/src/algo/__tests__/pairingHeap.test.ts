import { describe, it, expect } from 'vitest';
import { PairingHeap } from '../pairingHeap';

const cmp = (a: number, b: number) => a - b;

describe('PairingHeap', () => {
  it('empty', () => {
    const h = new PairingHeap<number, number>(cmp);
    expect(h.size()).toBe(0);
    expect(h.isEmpty()).toBe(true);
    expect(h.peek()).toBeNull();
    expect(h.extractMin()).toBeNull();
  });

  it('insert one', () => {
    const h = new PairingHeap<number, string>(cmp);
    h.insert(5, 'x');
    expect(h.size()).toBe(1);
    expect(h.peek()).toEqual({ key: 5, value: 'x' });
  });

  it('extractMin smallest', () => {
    const h = new PairingHeap<number, number>(cmp);
    [5, 1, 3].forEach((k) => h.insert(k, k));
    expect(h.extractMin()!.key).toBe(1);
  });

  it('peek does not remove', () => {
    const h = new PairingHeap<number, number>(cmp);
    h.insert(7, 7);
    h.peek();
    expect(h.size()).toBe(1);
  });

  it('sorted extraction', () => {
    const h = new PairingHeap<number, number>(cmp);
    const data = [5, 2, 8, 1, 9, 3, 7];
    data.forEach((k) => h.insert(k, k));
    const out: number[] = [];
    while (!h.isEmpty()) out.push(h.extractMin()!.key);
    expect(out).toEqual([...data].sort((a, b) => a - b));
  });

  it('size decreases', () => {
    const h = new PairingHeap<number, number>(cmp);
    h.insert(1, 1); h.insert(2, 2);
    h.extractMin();
    expect(h.size()).toBe(1);
  });

  it('duplicate keys allowed', () => {
    const h = new PairingHeap<number, string>(cmp);
    h.insert(5, 'a'); h.insert(5, 'b');
    expect(h.size()).toBe(2);
    h.extractMin(); h.extractMin();
    expect(h.isEmpty()).toBe(true);
  });

  it('ascending insert', () => {
    const h = new PairingHeap<number, number>(cmp);
    for (let i = 0; i < 300; i++) h.insert(i, i);
    let prev = -1;
    while (!h.isEmpty()) {
      const x = h.extractMin()!.key;
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });

  it('descending insert', () => {
    const h = new PairingHeap<number, number>(cmp);
    for (let i = 300; i > 0; i--) h.insert(i, i);
    expect(h.extractMin()!.key).toBe(1);
  });

  it('string comparator', () => {
    const h = new PairingHeap<string, number>((a, b) => a.localeCompare(b));
    ['cherry', 'apple', 'banana'].forEach((k, i) => h.insert(k, i));
    expect(h.extractMin()!.key).toBe('apple');
  });

  it('mixed insert/extract', () => {
    const h = new PairingHeap<number, number>(cmp);
    h.insert(10, 10); h.insert(5, 5);
    expect(h.extractMin()!.key).toBe(5);
    h.insert(2, 2); h.insert(20, 20);
    expect(h.extractMin()!.key).toBe(2);
    expect(h.extractMin()!.key).toBe(10);
    expect(h.extractMin()!.key).toBe(20);
  });

  it('isEmpty toggles', () => {
    const h = new PairingHeap<number, number>(cmp);
    expect(h.isEmpty()).toBe(true);
    h.insert(1, 1);
    expect(h.isEmpty()).toBe(false);
    h.extractMin();
    expect(h.isEmpty()).toBe(true);
  });

  it('random workload deterministic sort', () => {
    const h = new PairingHeap<number, number>(cmp);
    let seed = 7919;
    const data: number[] = [];
    for (let i = 0; i < 200; i++) {
      seed = (seed * 48271) % 2147483647;
      const k = seed % 1000;
      data.push(k);
      h.insert(k, k);
    }
    const out: number[] = [];
    while (!h.isEmpty()) out.push(h.extractMin()!.key);
    expect(out).toEqual([...data].sort((a, b) => a - b));
  });
});
