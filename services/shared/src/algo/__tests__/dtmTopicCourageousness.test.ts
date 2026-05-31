import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCourageousness, timidDtmTopics } from '../dtmTopicCourageousness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCourageousness', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCourageousness([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCourageousness([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('bold => bold', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'bold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('bold');
  });

  it('steady => mixed', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('hesitant => timid', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'hesitant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('timid');
  });

  it('timid => timid', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'timid' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('timid');
  });

  it('mixed midpoint => hesitant', () => {
    const r = summarizeDtmTopicCourageousness([
      { topic: 'values', signal: 'bold' },
      { topic: 'values', signal: 'timid' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hesitant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'x', signal: 'bold' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCourageousness([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCourageousness([
      { topic: 'values', signal: 'bold' },
      { topic: 'values', signal: 'hesitant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('timidDtmTopics filter', () => {
    const r = summarizeDtmTopicCourageousness([
      { topic: 'values', signal: 'timid' },
      { topic: 'family', signal: 'hesitant' },
      { topic: 'finance', signal: 'bold' },
    ]);
    expect(timidDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCourageousness([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCourageousness([
      { topic: 'values', signal: 'bold' },
      { topic: 'family', signal: 'timid' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
