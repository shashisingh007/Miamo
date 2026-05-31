import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicDelightExpression, dulledDtmTopics } from '../dtmTopicDelightExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicDelightExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicDelightExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicDelightExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('beaming => pleased', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'beaming' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('pleased');
  });

  it('pleased => mixed', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'pleased' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('dim => dulled', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'dim' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dulled');
  });

  it('dulled => dulled', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'dulled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dulled');
  });

  it('mixed midpoint => dim', () => {
    const r = summarizeDtmTopicDelightExpression([
      { topic: 'values', signal: 'beaming' },
      { topic: 'values', signal: 'dulled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dim');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'x', signal: 'beaming' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicDelightExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicDelightExpression([
      { topic: 'values', signal: 'beaming' },
      { topic: 'values', signal: 'dim' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dulledDtmTopics filter', () => {
    const r = summarizeDtmTopicDelightExpression([
      { topic: 'values', signal: 'dulled' },
      { topic: 'family', signal: 'dim' },
      { topic: 'finance', signal: 'beaming' },
    ]);
    expect(dulledDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicDelightExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicDelightExpression([
      { topic: 'values', signal: 'beaming' },
      { topic: 'family', signal: 'dulled' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
