import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPlayfulnessTone, somberDtmTopics } from '../dtmTopicPlayfulnessTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPlayfulnessTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPlayfulnessTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPlayfulnessTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('playful => playful', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'playful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('playful');
  });

  it('lighthearted => mixed', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'lighthearted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('serious => somber', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'serious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('somber');
  });

  it('somber => somber', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'somber' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('somber');
  });

  it('mid => serious', () => {
    const r = summarizeDtmTopicPlayfulnessTone([
      { topic: 'values', signal: 'playful' },
      { topic: 'values', signal: 'somber' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('serious');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'x', signal: 'playful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPlayfulnessTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPlayfulnessTone([
      { topic: 'values', signal: 'playful' },
      { topic: 'values', signal: 'serious' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('somberDtmTopics filter', () => {
    const r = summarizeDtmTopicPlayfulnessTone([
      { topic: 'values', signal: 'somber' },
      { topic: 'family', signal: 'serious' },
      { topic: 'finance', signal: 'playful' },
    ]);
    expect(somberDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicPlayfulnessTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicPlayfulnessTone([
      { topic: 'values', signal: 'playful' },
      { topic: 'family', signal: 'somber' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
