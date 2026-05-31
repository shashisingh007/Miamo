import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicBelongingDepth, isolatedDtmTopics } from '../dtmTopicBelongingDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicBelongingDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicBelongingDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicBelongingDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('rooted => rooted', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'rooted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rooted');
  });

  it('connected => mixed', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'connected' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('peripheral => isolated', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'peripheral' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('isolated');
  });

  it('isolated => isolated', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'isolated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('isolated');
  });

  it('mixed midpoint => peripheral', () => {
    const r = summarizeDtmTopicBelongingDepth([
      { topic: 'values', signal: 'rooted' },
      { topic: 'values', signal: 'isolated' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('peripheral');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'x', signal: 'rooted' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicBelongingDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicBelongingDepth([
      { topic: 'values', signal: 'rooted' },
      { topic: 'values', signal: 'peripheral' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('isolatedDtmTopics filter', () => {
    const r = summarizeDtmTopicBelongingDepth([
      { topic: 'values', signal: 'isolated' },
      { topic: 'family', signal: 'peripheral' },
      { topic: 'finance', signal: 'rooted' },
    ]);
    expect(isolatedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicBelongingDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicBelongingDepth([
      { topic: 'values', signal: 'rooted' },
      { topic: 'family', signal: 'isolated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
