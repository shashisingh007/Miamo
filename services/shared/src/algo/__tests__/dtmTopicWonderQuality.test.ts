import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWonderQuality, jadedDtmTopics } from '../dtmTopicWonderQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWonderQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWonderQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWonderQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('awe => curious', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'awe' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('curious');
  });

  it('curious => mixed', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat => jaded', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jaded');
  });

  it('jaded => jaded', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'jaded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jaded');
  });

  it('mixed midpoint => flat', () => {
    const r = summarizeDtmTopicWonderQuality([
      { topic: 'values', signal: 'awe' },
      { topic: 'values', signal: 'jaded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'x', signal: 'awe' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWonderQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWonderQuality([
      { topic: 'values', signal: 'awe' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('jadedDtmTopics filter', () => {
    const r = summarizeDtmTopicWonderQuality([
      { topic: 'values', signal: 'jaded' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'awe' },
    ]);
    expect(jadedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWonderQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWonderQuality([
      { topic: 'values', signal: 'awe' },
      { topic: 'family', signal: 'jaded' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
