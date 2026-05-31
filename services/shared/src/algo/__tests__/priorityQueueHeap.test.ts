import { describe, it, expect } from 'vitest';
import { createPriorityQueue } from '../priorityQueueHeap';

describe('priorityQueueHeap', () => {
  it('throws when comparator missing', () => {
    expect(() => createPriorityQueue(null as any)).toThrow(TypeError);
  });

  it('starts empty', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    expect(pq.size).toBe(0);
    expect(pq.peek()).toBeUndefined();
    expect(pq.pop()).toBeUndefined();
  });

  it('push + pop returns items in min-heap order', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    [5, 1, 9, 3, 7].forEach((x) => pq.push(x));
    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(3);
    expect(pq.pop()).toBe(5);
    expect(pq.pop()).toBe(7);
    expect(pq.pop()).toBe(9);
    expect(pq.size).toBe(0);
  });

  it('peek does not remove', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    pq.push(2);
    pq.push(1);
    expect(pq.peek()).toBe(1);
    expect(pq.size).toBe(2);
  });

  it('respects custom comparator (max-heap)', () => {
    const pq = createPriorityQueue<number>((a, b) => b - a);
    [5, 1, 9, 3].forEach((x) => pq.push(x));
    expect(pq.pop()).toBe(9);
    expect(pq.pop()).toBe(5);
  });

  it('works with object priorities', () => {
    interface J { id: string; priority: number; }
    const pq = createPriorityQueue<J>((a, b) => a.priority - b.priority);
    pq.push({ id: 'b', priority: 5 });
    pq.push({ id: 'a', priority: 1 });
    pq.push({ id: 'c', priority: 3 });
    expect(pq.pop()?.id).toBe('a');
    expect(pq.pop()?.id).toBe('c');
    expect(pq.pop()?.id).toBe('b');
  });

  it('heapifies initial array in O(n)', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b, [9, 4, 7, 1, 6, 3]);
    expect(pq.peek()).toBe(1);
    expect(pq.size).toBe(6);
  });

  it('toSortedArray returns items in priority order without draining', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    [5, 1, 9, 3].forEach((x) => pq.push(x));
    expect(pq.toSortedArray()).toEqual([1, 3, 5, 9]);
    expect(pq.size).toBe(4);
  });

  it('clear empties the queue', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    pq.push(1);
    pq.push(2);
    pq.clear();
    expect(pq.size).toBe(0);
    expect(pq.pop()).toBeUndefined();
  });

  it('handles duplicate priorities deterministically (one of equal items returned)', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    [1, 1, 1].forEach((x) => pq.push(x));
    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(1);
  });

  it('alternating push/pop keeps invariant', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    pq.push(5);
    pq.push(3);
    expect(pq.pop()).toBe(3);
    pq.push(1);
    pq.push(4);
    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(4);
    expect(pq.pop()).toBe(5);
  });

  it('large random sequence is fully sorted on drain', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b);
    const xs: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const v = Math.floor(Math.random() * 10_000);
      xs.push(v);
      pq.push(v);
    }
    xs.sort((a, b) => a - b);
    const out: number[] = [];
    while (pq.size > 0) out.push(pq.pop()!);
    expect(out).toEqual(xs);
  });

  it('initial=[] is fine', () => {
    const pq = createPriorityQueue<number>((a, b) => a - b, []);
    expect(pq.size).toBe(0);
  });
});
