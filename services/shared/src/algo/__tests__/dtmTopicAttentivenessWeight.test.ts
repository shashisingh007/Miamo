import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAttentivenessWeight,
  absentDtmTopics,
} from '../dtmTopicAttentivenessWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAttentivenessWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAttentivenessWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAttentivenessWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('attentive => attentive', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'attentive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('attentive');
  });

  it('present => mixed', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distracted => absent', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid => distracted', () => {
    const r = summarizeDtmTopicAttentivenessWeight([
      { topic: 'values', signal: 'attentive' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'x', signal: 'attentive' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAttentivenessWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAttentivenessWeight([
      { topic: 'values', signal: 'attentive' },
      { topic: 'values', signal: 'distracted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentDtmTopics filter', () => {
    const r = summarizeDtmTopicAttentivenessWeight([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'attentive' },
    ]);
    expect(absentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAttentivenessWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAttentivenessWeight([
      { topic: 'values', signal: 'attentive' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
