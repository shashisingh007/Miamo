import { describe, it, expect } from 'vitest';
import { _internals as embed } from '../embeddings';
import { _internals as cold } from '../cold-store';
import { gunzipSync } from 'node:zlib';

const { interestVecFrom, vibeEmbFrom, behaviorEmbFrom, cosine, l2Normalize, toBuffer, fromBuffer } = embed;
const { toNdjsonGz } = cold;

describe('embeddings', () => {
  it('l2Normalize: unit length after normalization', () => {
    const v = new Float32Array([3, 4]);
    l2Normalize(v);
    expect(Math.hypot(v[0], v[1])).toBeCloseTo(1, 5);
  });

  it('cosine: identical vectors = 1, orthogonal = 0', () => {
    const a = l2Normalize(new Float32Array([1, 0, 0]));
    const b = l2Normalize(new Float32Array([1, 0, 0]));
    const c = l2Normalize(new Float32Array([0, 1, 0]));
    expect(cosine(a, b)).toBeCloseTo(1, 5);
    expect(cosine(a, c)).toBeCloseTo(0, 5);
  });

  it('interestVecFrom: 32 dims, unit norm, deterministic', () => {
    const rows = [
      { evt: 'discover.swipe', count: 100, ageDays: 1 },
      { evt: 'message.send', count: 50, ageDays: 2 },
      { evt: 'page.view', count: 200, ageDays: 0 },
    ];
    const v1 = interestVecFrom(rows);
    const v2 = interestVecFrom(rows);
    expect(v1.length).toBe(32);
    expect(cosine(v1, v2)).toBeCloseTo(1, 5);
  });

  it('vibeEmbFrom: recency decay excludes 14d+', () => {
    const fresh = vibeEmbFrom([{ evt: 'message.send', count: 100, ageDays: 1 }]);
    const stale = vibeEmbFrom([{ evt: 'message.send', count: 100, ageDays: 20 }]);
    const freshSum = Array.from(fresh).reduce((a, b) => a + Math.abs(b), 0);
    const staleSum = Array.from(stale).reduce((a, b) => a + Math.abs(b), 0);
    expect(freshSum).toBeGreaterThan(0);
    expect(staleSum).toBe(0);
  });

  it('behaviorEmbFrom: chronotype one-hot lives in first 5 dims', () => {
    const v = behaviorEmbFrom(
      { uidHash: 'x', chronotype: 'morning', attentionProfile: 'reader',
        rageClickRate: 0.01, deadClickRate: 0.02, swipeRightRatio: 0.4 },
      [],
    );
    // morning is index 0 in CHRONOTYPES; reader is index 0 in PROFILES (so dim 5)
    expect(v[0]).toBeGreaterThan(0);
    expect(v[5]).toBeGreaterThan(0);
  });

  it('toBuffer/fromBuffer roundtrip is lossless', () => {
    const v = l2Normalize(new Float32Array([0.1, 0.2, 0.3, 0.4]));
    const b = toBuffer(v);
    const back = fromBuffer(b, 4);
    for (let i = 0; i < 4; i++) expect(back[i]).toBeCloseTo(v[i], 6);
  });
});

describe('cold-store ndjson.gz', () => {
  it('produces valid gzip that decodes back to one JSON object per line', () => {
    const rows = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }];
    const gz = toNdjsonGz(rows);
    const text = gunzipSync(gz).toString('utf8');
    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({ a: 1, b: 'x' });
    expect(JSON.parse(lines[1])).toEqual({ a: 2, b: 'y' });
  });
  it('empty input → empty gzip body', () => {
    const gz = toNdjsonGz([]);
    expect(gunzipSync(gz).toString('utf8')).toBe('');
  });
});
