import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicValidationFlow, invalidatingDtmTopics } from '../dtmTopicValidationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicValidationFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicValidationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicValidationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('affirming', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'affirming' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('affirming');
  });

  it('validating => mixed', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'validating' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('minimizing => invalidating', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'minimizing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('invalidating');
  });

  it('invalidating', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'invalidating' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('invalidating');
  });

  it('mid', () => {
    const r = summarizeDtmTopicValidationFlow([
      { topic: 'values', signal: 'affirming' },
      { topic: 'values', signal: 'invalidating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('minimizing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'x', signal: 'affirming' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicValidationFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicValidationFlow([
      { topic: 'values', signal: 'affirming' },
      { topic: 'values', signal: 'invalidating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('invalidatingDtmTopics filter', () => {
    const r = summarizeDtmTopicValidationFlow([
      { topic: 'values', signal: 'invalidating' },
      { topic: 'family', signal: 'minimizing' },
      { topic: 'finance', signal: 'affirming' },
    ]);
    expect(invalidatingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicValidationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicValidationFlow([
      { topic: 'values', signal: 'affirming' },
      { topic: 'family', signal: 'invalidating' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
