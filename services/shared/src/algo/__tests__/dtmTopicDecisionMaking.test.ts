import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicDecisionMaking,
  authoritarianDtmTopics,
} from '../dtmTopicDecisionMaking';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicDecisionMaking', () => {
  it('returns 16 canonical topics in order', () => {
    const r = summarizeDtmTopicDecisionMaking([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicDecisionMaking([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('co-decide => partnered', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'co-decide' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('partnered');
  });

  it('consult-then-decide (0.75) => collaborative', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'consult-then-decide' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('collaborative');
  });

  it('inform-after (0.4) => asymmetric', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'inform-after' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('asymmetric');
  });

  it('unilateral (0.15) => authoritarian', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'unilateral' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('authoritarian');
  });

  it('override => authoritarian', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'override' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('authoritarian');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'xxx', signal: 'co-decide' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicDecisionMaking([{ topic: 'finance', signal: 'huh' as any }]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const r = summarizeDtmTopicDecisionMaking([
      { topic: 'finance', signal: 'co-decide' },
      { topic: 'finance', signal: 'override' },
      { topic: 'family', signal: 'inform-after' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(2);
    expect(r.find((x) => x.topic === 'family')!.n).toBe(1);
  });

  it('authoritarianDtmTopics filters', () => {
    const r = summarizeDtmTopicDecisionMaking([
      { topic: 'finance', signal: 'override' },
      { topic: 'family', signal: 'co-decide' },
    ]);
    expect(authoritarianDtmTopics(r).map((x) => x.topic)).toEqual(['finance']);
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicDecisionMaking([
      { topic: 'finance', signal: 'co-decide' },
      { topic: 'family', signal: 'override' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicDecisionMaking([
      { topic: 'future', signal: 'co-decide' },
      { topic: 'values', signal: 'override' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
