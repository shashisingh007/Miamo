import { describe, it, expect } from 'vitest';
import {
  createSlidingWindow,
  recordEvent,
  countInWindow,
  pruneOlderThan,
} from '../slidingWindowCounter';

describe('slidingWindowCounter', () => {
  it('empty window -> count 0', () => {
    const s = createSlidingWindow(8);
    expect(countInWindow(s, 1000, 1000)).toBe(0);
  });

  it('records and counts within window', () => {
    const s = createSlidingWindow(8);
    recordEvent(s, 100);
    recordEvent(s, 500);
    recordEvent(s, 900);
    expect(countInWindow(s, 1000, 500)).toBe(2); // 500 and 900
  });

  it('respects weights', () => {
    const s = createSlidingWindow(4);
    recordEvent(s, 0, 3);
    recordEvent(s, 0, 2);
    expect(countInWindow(s, 0, 1)).toBe(5);
  });

  it('ignores invalid inputs', () => {
    const s = createSlidingWindow(4);
    recordEvent(s, NaN);
    recordEvent(s, 100, -1);
    recordEvent(s, 100, 0);
    expect(s.length).toBe(0);
  });

  it('overflows by overwriting oldest (ring)', () => {
    const s = createSlidingWindow(3);
    for (let i = 0; i < 5; i++) recordEvent(s, i * 100);
    expect(s.length).toBe(3); // capacity capped
    // only the last 3 timestamps (200, 300, 400) should be present
    expect(countInWindow(s, 400, 250)).toBe(3);
  });

  it('windowMs<=0 returns 0', () => {
    const s = createSlidingWindow(2);
    recordEvent(s, 0);
    expect(countInWindow(s, 0, 0)).toBe(0);
  });

  it('size floor is 1', () => {
    const s = createSlidingWindow(0);
    expect(s.size).toBe(1);
  });

  it('pruneOlderThan drops stale entries', () => {
    const s = createSlidingWindow(8);
    [100, 200, 500, 900].forEach((t) => recordEvent(s, t));
    pruneOlderThan(s, 400);
    expect(s.length).toBe(2);
    expect(countInWindow(s, 1000, 1000)).toBe(2);
  });

  it('counts equal to nowMs as included', () => {
    const s = createSlidingWindow(2);
    recordEvent(s, 1000);
    expect(countInWindow(s, 1000, 1)).toBe(1);
  });

  it('handles future timestamps by excluding them', () => {
    const s = createSlidingWindow(2);
    recordEvent(s, 5000);
    expect(countInWindow(s, 1000, 1000)).toBe(0);
  });
});
