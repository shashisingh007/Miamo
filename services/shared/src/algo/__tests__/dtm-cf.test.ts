import { describe, it, expect } from 'vitest';
import { dtmAffinity, dtmTopicGaps } from '../dtm';
import { cfScore, cfScoresByHash } from '../cf';

function vec(values: number[]): Float32Array {
  const v = new Float32Array(values);
  let s = 0; for (const x of v) s += x*x;
  const inv = s > 0 ? 1/Math.sqrt(s) : 1;
  for (let i = 0; i < v.length; i++) v[i] *= inv;
  return v;
}

describe('dtm', () => {
  it('identical vectors → affinity 1', () => {
    const a = vec([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
    expect(dtmAffinity(a, a)).toBeCloseTo(1, 5);
  });
  it('orthogonal vectors → affinity 0.5', () => {
    const a = vec([1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    const b = vec([0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    expect(dtmAffinity(a, b)).toBeCloseTo(0.5, 3);
  });
  it('null inputs → null', () => {
    expect(dtmAffinity(null, vec([1,0]))).toBeNull();
    expect(dtmAffinity(vec([1,0]), null)).toBeNull();
  });
  it('mismatched dims → null', () => {
    expect(dtmAffinity(vec([1,2]), vec([1,2,3]))).toBeNull();
  });
  it('topic gaps surface biggest disagreements', () => {
    const a = vec([1,0,0,0]);
    const b = vec([0,1,0,0]);
    const gaps = dtmTopicGaps(a, b);
    expect(gaps).not.toBeNull();
    expect((gaps as number[]).length).toBe(4);
  });
});

describe('cf', () => {
  it('undefined neighbour → 0', () => {
    expect(cfScore(undefined)).toBe(0);
  });
  it('high affinity + high support → high score', () => {
    expect(cfScore({ bHash: 'x', affinity: 0.9, coCount: 100 })).toBeGreaterThan(80);
  });
  it('high affinity but thin support → mid score', () => {
    const high = cfScore({ bHash: 'x', affinity: 0.9, coCount: 100 });
    const thin = cfScore({ bHash: 'x', affinity: 0.9, coCount: 1 });
    expect(thin).toBeLessThan(high);
  });
  it('bulk lookup', () => {
    const m = cfScoresByHash([
      { bHash: 'a', affinity: 0.5, coCount: 10 },
      { bHash: 'b', affinity: 0.8, coCount: 50 },
    ]);
    expect(m.size).toBe(2);
    expect(m.get('b')! > m.get('a')!).toBe(true);
  });
});
