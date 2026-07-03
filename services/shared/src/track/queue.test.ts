import { describe, it, expect } from 'vitest';
import { RingQueue } from '../../../web/src/lib/track/transport/queue';

describe('RingQueue', () => {
  it('respects capacity and evicts oldest', () => {
    const q = new RingQueue<number>(3);
    q.push(1); q.push(2); q.push(3);
    expect(q.size).toBe(3);
    q.push(4);
    expect(q.size).toBe(3);
    expect(q.droppedCount).toBe(1);
    expect(q.drain()).toEqual([2, 3, 4]);
    expect(q.size).toBe(0);
  });

  it('drains in fifo order', () => {
    const q = new RingQueue<string>(8);
    ['a','b','c','d'].forEach((x) => q.push(x));
    expect(q.drain(2)).toEqual(['a','b']);
    expect(q.drain()).toEqual(['c','d']);
  });
});
