import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSharedMeaning, fragmentedDtmTopics } from '../dtmTopicSharedMeaning';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSharedMeaning', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicSharedMeaning([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSharedMeaning([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('co-constructed => shared', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'co-constructed' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('shared');
  });

  it('aligned (0.8) => parallel', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'aligned' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('parallel');
  });

  it('parallel => parallel', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'parallel' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('parallel');
  });

  it('divergent => fragmented', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'divergent' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('fragmented');
  });

  it('fragmented => fragmented', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'fragmented' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('fragmented');
  });

  it('mixed 0.5 => divergent', () => {
    const r = summarizeDtmTopicSharedMeaning([
      { topic: 'communication', signal: 'co-constructed' },
      { topic: 'communication', signal: 'fragmented' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('divergent');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'x', signal: 'co-constructed' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSharedMeaning([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSharedMeaning([
      { topic: 'communication', signal: 'aligned' },
      { topic: 'communication', signal: 'co-constructed' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('fragmentedDtmTopics filters', () => {
    const r = summarizeDtmTopicSharedMeaning([
      { topic: 'communication', signal: 'fragmented' },
      { topic: 'family', signal: 'divergent' },
      { topic: 'finance', signal: 'co-constructed' },
    ]);
    expect(fragmentedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSharedMeaning([
      { topic: 'communication', signal: 'co-constructed' },
      { topic: 'family', signal: 'fragmented' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSharedMeaning([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
