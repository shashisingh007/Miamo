import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSorrowExpression, sorrowfulDtmTopics } from '../dtmTopicSorrowExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSorrowExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSorrowExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSorrowExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('desolate => sorrowful', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'desolate' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sorrowful');
  });

  it('sorrowful signal => mixed', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'sorrowful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('wistful => composed', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'wistful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('composed');
  });

  it('composed => composed', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'composed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('composed');
  });

  it('mixed midpoint => wistful', () => {
    const r = summarizeDtmTopicSorrowExpression([
      { topic: 'values', signal: 'desolate' },
      { topic: 'values', signal: 'composed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wistful');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'x', signal: 'desolate' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSorrowExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSorrowExpression([
      { topic: 'values', signal: 'desolate' },
      { topic: 'values', signal: 'wistful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('sorrowfulDtmTopics filter', () => {
    const r = summarizeDtmTopicSorrowExpression([
      { topic: 'values', signal: 'desolate' },
      { topic: 'family', signal: 'sorrowful' },
      { topic: 'finance', signal: 'composed' },
    ]);
    expect(sorrowfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSorrowExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSorrowExpression([
      { topic: 'values', signal: 'desolate' },
      { topic: 'family', signal: 'composed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
