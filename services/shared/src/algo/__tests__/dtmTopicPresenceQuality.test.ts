import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPresenceQuality, absentDtmTopics } from '../dtmTopicPresenceQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPresenceQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPresenceQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPresenceQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully_present => present', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'fully_present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('present');
  });

  it('present => partial', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('distracted => absent', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mixed 0.5 => distracted', () => {
    const r = summarizeDtmTopicPresenceQuality([
      { topic: 'values', signal: 'fully_present' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'x', signal: 'present' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPresenceQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPresenceQuality([
      { topic: 'values', signal: 'present' },
      { topic: 'values', signal: 'partial' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentDtmTopics filters', () => {
    const r = summarizeDtmTopicPresenceQuality([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'fully_present' },
    ]);
    expect(absentDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicPresenceQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicPresenceQuality([
      { topic: 'values', signal: 'fully_present' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
