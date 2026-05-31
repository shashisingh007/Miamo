import { describe, it, expect } from 'vitest';
import {
  StreamingMedianTwoHeaps,
  streamingMedianTwoHeaps,
} from '../streamingMedianTwoHeaps';

describe('StreamingMedianTwoHeaps', () => {
  it('throws on non-finite', () => {
    const m = new StreamingMedianTwoHeaps();
    expect(() => m.add(NaN)).toThrow();
  });

  it('throws on empty median', () => {
    const m = new StreamingMedianTwoHeaps();
    expect(() => m.median()).toThrow();
  });

  it('odd count', () => {
    const m = new StreamingMedianTwoHeaps();
    [3, 1, 4, 1, 5].forEach((v) => m.add(v));
    expect(m.median()).toBe(3);
  });

  it('even count', () => {
    const m = new StreamingMedianTwoHeaps();
    [1, 2, 3, 4].forEach((v) => m.add(v));
    expect(m.median()).toBeCloseTo(2.5, 9);
  });

  it('size tracking', () => {
    const m = new StreamingMedianTwoHeaps();
    m.add(1);
    m.add(2);
    expect(m.size()).toBe(2);
  });

  it('streaming output matches sorted median at every step', () => {
    const v = [5, 2, 8, 1, 9, 3, 7, 4, 6];
    const out = streamingMedianTwoHeaps(v);
    for (let i = 0; i < v.length; i++) {
      const partial = v.slice(0, i + 1).sort((a, b) => a - b);
      const k = partial.length;
      const expected = k % 2 === 1 ? partial[Math.floor(k / 2)] : (partial[k / 2 - 1] + partial[k / 2]) / 2;
      expect(out[i]).toBeCloseTo(expected, 9);
    }
  });

  it('handles duplicates', () => {
    const m = new StreamingMedianTwoHeaps();
    [5, 5, 5, 5].forEach((v) => m.add(v));
    expect(m.median()).toBe(5);
  });

  it('handles negatives', () => {
    const out = streamingMedianTwoHeaps([-5, -2, 0, 2, 5]);
    expect(out[4]).toBe(0);
  });

  it('single value', () => {
    const m = new StreamingMedianTwoHeaps();
    m.add(7);
    expect(m.median()).toBe(7);
  });

  it('two values', () => {
    const m = new StreamingMedianTwoHeaps();
    m.add(1);
    m.add(3);
    expect(m.median()).toBe(2);
  });

  it('streamingMedianTwoHeaps empty input', () => {
    expect(streamingMedianTwoHeaps([])).toEqual([]);
  });

  it('streamingMedianTwoHeaps throws on non-array', () => {
    expect(() => streamingMedianTwoHeaps(null as any)).toThrow();
  });

  it('large random stress', () => {
    const v: number[] = [];
    let seed = 42;
    for (let i = 0; i < 200; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      v.push(seed % 1000);
    }
    const out = streamingMedianTwoHeaps(v);
    const sorted = v.slice().sort((a, b) => a - b);
    const expected = (sorted[99] + sorted[100]) / 2;
    expect(out[199]).toBeCloseTo(expected, 9);
  });

  it('floats', () => {
    const out = streamingMedianTwoHeaps([1.5, 2.5, 3.5]);
    expect(out[2]).toBeCloseTo(2.5, 9);
  });
});
