import { describe, it, expect } from 'vitest';
import { RingBufferDeque } from '../ringBufferDeque';

describe('RingBufferDeque', () => {
  it('starts empty', () => {
    const d = new RingBufferDeque<number>();
    expect(d.size).toBe(0);
    expect(d.isEmpty()).toBe(true);
  });

  it('rejects bad initial capacity', () => {
    expect(() => new RingBufferDeque(0)).toThrow();
    expect(() => new RingBufferDeque(-1)).toThrow();
    expect(() => new RingBufferDeque(1.5)).toThrow();
  });

  it('pushBack + popFront FIFO', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(1); d.pushBack(2); d.pushBack(3);
    expect(d.popFront()).toBe(1);
    expect(d.popFront()).toBe(2);
    expect(d.popFront()).toBe(3);
    expect(d.isEmpty()).toBe(true);
  });

  it('pushBack + popBack LIFO', () => {
    const d = new RingBufferDeque<string>(4);
    d.pushBack('a'); d.pushBack('b'); d.pushBack('c');
    expect(d.popBack()).toBe('c');
    expect(d.popBack()).toBe('b');
    expect(d.popBack()).toBe('a');
  });

  it('pushFront reverses order', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushFront(1); d.pushFront(2); d.pushFront(3);
    expect(d.toArray()).toEqual([3, 2, 1]);
  });

  it('mixed operations', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(2); d.pushBack(3);
    d.pushFront(1);
    d.pushBack(4);
    d.pushFront(0);
    expect(d.toArray()).toEqual([0, 1, 2, 3, 4]);
  });

  it('peek does not remove', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(1); d.pushBack(2);
    expect(d.peekFront()).toBe(1);
    expect(d.peekBack()).toBe(2);
    expect(d.size).toBe(2);
  });

  it('peek of empty returns undefined', () => {
    const d = new RingBufferDeque<number>();
    expect(d.peekFront()).toBeUndefined();
    expect(d.peekBack()).toBeUndefined();
  });

  it('pop on empty returns undefined', () => {
    const d = new RingBufferDeque<number>();
    expect(d.popFront()).toBeUndefined();
    expect(d.popBack()).toBeUndefined();
  });

  it('auto-grows past initial capacity', () => {
    const d = new RingBufferDeque<number>(2);
    for (let i = 0; i < 100; i++) d.pushBack(i);
    expect(d.size).toBe(100);
    expect(d.capacity).toBeGreaterThanOrEqual(100);
    expect(d.peekFront()).toBe(0);
    expect(d.peekBack()).toBe(99);
  });

  it('wraps around head', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(1); d.pushBack(2); d.pushBack(3); d.pushBack(4);
    d.popFront(); d.popFront();
    d.pushBack(5); d.pushBack(6);
    expect(d.toArray()).toEqual([3, 4, 5, 6]);
  });

  it('grow preserves order across wrap', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(1); d.pushBack(2); d.pushBack(3); d.pushBack(4);
    d.popFront(); d.popFront();
    d.pushBack(5); d.pushBack(6);
    // Now full at cap 4. Force grow.
    d.pushBack(7);
    expect(d.toArray()).toEqual([3, 4, 5, 6, 7]);
  });

  it('at(i) random access', () => {
    const d = new RingBufferDeque<string>();
    d.pushBack('a'); d.pushBack('b'); d.pushBack('c');
    expect(d.at(0)).toBe('a');
    expect(d.at(1)).toBe('b');
    expect(d.at(2)).toBe('c');
  });

  it('at out-of-range => undefined', () => {
    const d = new RingBufferDeque<number>();
    d.pushBack(1);
    expect(d.at(5)).toBeUndefined();
    expect(d.at(-1)).toBeUndefined();
  });

  it('at non-integer throws', () => {
    const d = new RingBufferDeque<number>();
    expect(() => d.at(1.5)).toThrow();
  });

  it('clear empties', () => {
    const d = new RingBufferDeque<number>();
    d.pushBack(1); d.pushBack(2);
    d.clear();
    expect(d.size).toBe(0);
    expect(d.toArray()).toEqual([]);
  });

  it('toArray preserves order through pushes/pops', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushBack(1); d.pushFront(0); d.pushBack(2); d.pushFront(-1);
    expect(d.toArray()).toEqual([-1, 0, 1, 2]);
  });

  it('size tracks operations', () => {
    const d = new RingBufferDeque<number>();
    d.pushBack(1);
    d.pushBack(2);
    d.popFront();
    d.pushFront(0);
    expect(d.size).toBe(2);
  });

  it('capacity grows by doubling', () => {
    const d = new RingBufferDeque<number>(4);
    for (let i = 0; i < 5; i++) d.pushBack(i);
    expect(d.capacity).toBe(8);
  });

  it('handles many push/pop cycles', () => {
    const d = new RingBufferDeque<number>(4);
    for (let i = 0; i < 1000; i++) {
      d.pushBack(i);
      if (i % 3 === 0) d.popFront();
    }
    expect(d.size).toBeGreaterThan(0);
  });

  it('pushFront on empty sets head correctly', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushFront(7);
    expect(d.peekFront()).toBe(7);
    expect(d.peekBack()).toBe(7);
    expect(d.size).toBe(1);
  });

  it('alternating pushFront/popBack', () => {
    const d = new RingBufferDeque<number>(4);
    d.pushFront(1);
    d.pushFront(2);
    d.pushFront(3);
    expect(d.popBack()).toBe(1);
    expect(d.popBack()).toBe(2);
    expect(d.popBack()).toBe(3);
  });

  it('generic type safety with strings', () => {
    const d = new RingBufferDeque<string>();
    d.pushBack('hello');
    expect(d.peekFront()).toBe('hello');
  });
});
