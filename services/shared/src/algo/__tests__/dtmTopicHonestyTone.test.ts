import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHonestyTone, deceptiveDtmTopics } from '../dtmTopicHonestyTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHonestyTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHonestyTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHonestyTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('candid => honest', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'candid' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('honest');
  });

  it('honest => hedged', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'honest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hedged');
  });

  it('hedged => hedged', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'hedged' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hedged');
  });

  it('evasive => deceptive', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'evasive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deceptive');
  });

  it('deceptive => deceptive', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'deceptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deceptive');
  });

  it('mixed 0.5 => evasive', () => {
    const r = summarizeDtmTopicHonestyTone([
      { topic: 'values', signal: 'candid' },
      { topic: 'values', signal: 'deceptive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('evasive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'x', signal: 'honest' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHonestyTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHonestyTone([
      { topic: 'values', signal: 'honest' },
      { topic: 'values', signal: 'hedged' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('deceptiveDtmTopics filters', () => {
    const r = summarizeDtmTopicHonestyTone([
      { topic: 'values', signal: 'deceptive' },
      { topic: 'family', signal: 'evasive' },
      { topic: 'finance', signal: 'candid' },
    ]);
    expect(deceptiveDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicHonestyTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHonestyTone([
      { topic: 'values', signal: 'candid' },
      { topic: 'family', signal: 'deceptive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
