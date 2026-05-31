import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAlivenessQuality, deadenedDtmTopics } from '../dtmTopicAlivenessQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAlivenessQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAlivenessQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAlivenessQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('electric => alive', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'electric' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('alive');
  });

  it('alive => present', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'alive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('present');
  });

  it('present => present', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('present');
  });

  it('numb => deadened', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'numb' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deadened');
  });

  it('deadened => deadened', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'deadened' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deadened');
  });

  it('mixed 0.5 => numb', () => {
    const r = summarizeDtmTopicAlivenessQuality([
      { topic: 'values', signal: 'electric' },
      { topic: 'values', signal: 'deadened' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'x', signal: 'electric' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAlivenessQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAlivenessQuality([
      { topic: 'values', signal: 'electric' },
      { topic: 'values', signal: 'numb' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('deadenedDtmTopics filter', () => {
    const r = summarizeDtmTopicAlivenessQuality([
      { topic: 'values', signal: 'deadened' },
      { topic: 'family', signal: 'numb' },
      { topic: 'finance', signal: 'electric' },
    ]);
    expect(deadenedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAlivenessQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAlivenessQuality([
      { topic: 'values', signal: 'electric' },
      { topic: 'family', signal: 'deadened' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
