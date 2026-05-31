import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAgencyExpression,
  selfErasedDtmTopics,
} from '../dtmTopicAgencyExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAgencyExpression', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicAgencyExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAgencyExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('choosing-freely => agentic', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'choosing-freely' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('agentic');
  });

  it('asserting (0.8) => accommodating', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'asserting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accommodating');
  });

  it('accommodating => accommodating', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'accommodating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accommodating');
  });

  it('over-adapting => self-erased', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'over-adapting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('self-erased');
  });

  it('self-erasing => self-erased', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'self-erasing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('self-erased');
  });

  it('mixed 0.5 => over-adapted', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'choosing-freely' },
      { topic: 'values', signal: 'self-erasing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('over-adapted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAgencyExpression([{ topic: 'q', signal: 'asserting' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'asserting' },
      { topic: 'values', signal: 'accommodating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('selfErasedDtmTopics filters', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'self-erasing' },
      { topic: 'family', signal: 'over-adapting' },
      { topic: 'finance', signal: 'choosing-freely' },
    ]);
    expect(selfErasedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAgencyExpression([
      { topic: 'values', signal: 'choosing-freely' },
      { topic: 'family', signal: 'self-erasing' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAgencyExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
