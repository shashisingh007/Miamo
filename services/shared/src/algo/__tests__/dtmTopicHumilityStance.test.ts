import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHumilityStance, arrogantDtmTopics } from '../dtmTopicHumilityStance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHumilityStance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHumilityStance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHumilityStance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('humble => humble', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'humble' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('humble');
  });

  it('modest => measured', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'modest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('measured => measured', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'measured' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('proud => arrogant', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'proud' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('arrogant => arrogant', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'arrogant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('arrogant');
  });

  it('mixed 0.5 => proud', () => {
    const r = summarizeDtmTopicHumilityStance([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'arrogant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('proud');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'x', signal: 'humble' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHumilityStance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHumilityStance([
      { topic: 'values', signal: 'humble' },
      { topic: 'values', signal: 'proud' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('arrogantDtmTopics filters', () => {
    const r = summarizeDtmTopicHumilityStance([
      { topic: 'values', signal: 'arrogant' },
      { topic: 'family', signal: 'proud' },
      { topic: 'finance', signal: 'humble' },
    ]);
    expect(arrogantDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicHumilityStance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHumilityStance([
      { topic: 'values', signal: 'humble' },
      { topic: 'family', signal: 'arrogant' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
