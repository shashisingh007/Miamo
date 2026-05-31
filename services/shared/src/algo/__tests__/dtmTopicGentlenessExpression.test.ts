import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGentlenessExpression, harshDtmTopics } from '../dtmTopicGentlenessExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGentlenessExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGentlenessExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGentlenessExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => soft', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('soft');
  });

  it('soft => mixed', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'soft' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('firm => harsh', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'firm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('harsh => harsh', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('mixed midpoint => firm', () => {
    const r = summarizeDtmTopicGentlenessExpression([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('firm');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'x', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGentlenessExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGentlenessExpression([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'firm' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('harshDtmTopics filter', () => {
    const r = summarizeDtmTopicGentlenessExpression([
      { topic: 'values', signal: 'harsh' },
      { topic: 'family', signal: 'firm' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(harshDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGentlenessExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGentlenessExpression([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'harsh' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
