import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHonestyFlow, deceptiveDtmTopics } from '../dtmTopicHonestyFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHonestyFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHonestyFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHonestyFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('transparent => honest', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'transparent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('honest');
  });

  it('honest => mixed', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'honest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deceptive');
  });

  it('deceptive', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'deceptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deceptive');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicHonestyFlow([
      { topic: 'values', signal: 'transparent' },
      { topic: 'values', signal: 'deceptive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'x', signal: 'transparent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHonestyFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHonestyFlow([
      { topic: 'values', signal: 'transparent' },
      { topic: 'values', signal: 'deceptive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('deceptiveDtmTopics filter', () => {
    const r = summarizeDtmTopicHonestyFlow([
      { topic: 'values', signal: 'deceptive' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'transparent' },
    ]);
    expect(deceptiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHonestyFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicHonestyFlow([
      { topic: 'values', signal: 'transparent' },
      { topic: 'family', signal: 'deceptive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
