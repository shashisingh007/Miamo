import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWitnessingFlow, absentDtmTopics } from '../dtmTopicWitnessingFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWitnessingFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWitnessingFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });
  it('empty => untested', () => {
    expect(summarizeDtmTopicWitnessingFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });
  it('present => attentive', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('attentive');
  });
  it('attentive signal => mixed', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'attentive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });
  it('mixed => mixed', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });
  it('distracted => absent', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });
  it('absent => absent', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });
  it('mixed midpoint => distracted', () => {
    const r = summarizeDtmTopicWitnessingFlow([
      { topic: 'values', signal: 'present' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });
  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'x', signal: 'present' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });
  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWitnessingFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });
  it('counts n', () => {
    const r = summarizeDtmTopicWitnessingFlow([
      { topic: 'values', signal: 'present' },
      { topic: 'values', signal: 'distracted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });
  it('absentDtmTopics filter', () => {
    const r = summarizeDtmTopicWitnessingFlow([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'present' },
    ]);
    expect(absentDtmTopics(r).length).toBe(2);
  });
  it('anchors', () => {
    const r = summarizeDtmTopicWitnessingFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWitnessingFlow([
      { topic: 'values', signal: 'present' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
