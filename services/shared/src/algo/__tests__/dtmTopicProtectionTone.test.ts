import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicProtectionTone, abandoningDtmTopics } from '../dtmTopicProtectionTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicProtectionTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicProtectionTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicProtectionTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('shielding => guarding', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'shielding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarding');
  });

  it('guarding => mixed', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'guarding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('exposing => abandoning', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'exposing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('abandoning');
  });

  it('abandoning', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'abandoning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('abandoning');
  });

  it('mid', () => {
    const r = summarizeDtmTopicProtectionTone([
      { topic: 'values', signal: 'shielding' },
      { topic: 'values', signal: 'abandoning' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('exposing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'x', signal: 'shielding' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicProtectionTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicProtectionTone([
      { topic: 'values', signal: 'shielding' },
      { topic: 'values', signal: 'abandoning' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('abandoningDtmTopics filter', () => {
    const r = summarizeDtmTopicProtectionTone([
      { topic: 'values', signal: 'abandoning' },
      { topic: 'family', signal: 'exposing' },
      { topic: 'finance', signal: 'shielding' },
    ]);
    expect(abandoningDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicProtectionTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicProtectionTone([
      { topic: 'values', signal: 'shielding' },
      { topic: 'family', signal: 'abandoning' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
