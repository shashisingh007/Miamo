import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicNeedsExpression,
  suppressedDtmTopics,
} from '../dtmTopicNeedsExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNeedsExpression', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicNeedsExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicNeedsExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('direct-ask => direct', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'direct-ask' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('direct');
  });

  it('soft-ask => hinting', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'soft-ask' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('hinting');
  });

  it('hint => hinting', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'hint' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('hinting');
  });

  it('avoidance => suppressed', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'avoidance' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('suppressed');
  });

  it('suppressed => suppressed', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'suppressed' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('suppressed');
  });

  it('mixed 0.5 => avoidant', () => {
    const r = summarizeDtmTopicNeedsExpression([
      { topic: 'communication', signal: 'direct-ask' },
      { topic: 'communication', signal: 'suppressed' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('avoidant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'x', signal: 'direct-ask' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicNeedsExpression([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicNeedsExpression([
      { topic: 'communication', signal: 'direct-ask' },
      { topic: 'communication', signal: 'hint' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('suppressedDtmTopics filters', () => {
    const r = summarizeDtmTopicNeedsExpression([
      { topic: 'communication', signal: 'suppressed' },
      { topic: 'family', signal: 'direct-ask' },
    ]);
    expect(suppressedDtmTopics(r)).toHaveLength(1);
    expect(suppressedDtmTopics(r)[0].topic).toBe('communication');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicNeedsExpression([
      { topic: 'communication', signal: 'direct-ask' },
      { topic: 'family', signal: 'suppressed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicNeedsExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
