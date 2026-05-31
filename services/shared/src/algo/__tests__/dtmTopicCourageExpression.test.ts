import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCourageExpression, cowedDtmTopics } from '../dtmTopicCourageExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCourageExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCourageExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCourageExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-courageous => courageous', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'fully-courageous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('courageous');
  });

  it('courageous => hesitant', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'courageous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hesitant');
  });

  it('hesitant => hesitant', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'hesitant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hesitant');
  });

  it('shrinking => cowed', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'shrinking' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cowed');
  });

  it('cowed => cowed', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'cowed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cowed');
  });

  it('mixed 0.5 => shrinking', () => {
    const r = summarizeDtmTopicCourageExpression([
      { topic: 'values', signal: 'fully-courageous' },
      { topic: 'values', signal: 'cowed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shrinking');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'x', signal: 'courageous' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCourageExpression([{ topic: 'values', signal: 'z' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCourageExpression([
      { topic: 'values', signal: 'courageous' },
      { topic: 'values', signal: 'hesitant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('cowedDtmTopics filters', () => {
    const r = summarizeDtmTopicCourageExpression([
      { topic: 'values', signal: 'cowed' },
      { topic: 'family', signal: 'shrinking' },
      { topic: 'finance', signal: 'fully-courageous' },
    ]);
    expect(cowedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicCourageExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCourageExpression([
      { topic: 'values', signal: 'fully-courageous' },
      { topic: 'family', signal: 'cowed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
