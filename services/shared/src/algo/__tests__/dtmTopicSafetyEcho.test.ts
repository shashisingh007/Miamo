import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSafetyEcho, alarmingDtmTopics } from '../dtmTopicSafetyEcho';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSafetyEcho', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSafetyEcho([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSafetyEcho([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reassuring => steadying', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'reassuring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steadying');
  });

  it('steadying => mixed', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'steadying' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('unsettling => alarming', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'unsettling' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('alarming');
  });

  it('alarming', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'alarming' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('alarming');
  });

  it('mid', () => {
    const r = summarizeDtmTopicSafetyEcho([
      { topic: 'values', signal: 'reassuring' },
      { topic: 'values', signal: 'alarming' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unsettling');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'x', signal: 'reassuring' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSafetyEcho([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSafetyEcho([
      { topic: 'values', signal: 'reassuring' },
      { topic: 'values', signal: 'alarming' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('alarmingDtmTopics filter', () => {
    const r = summarizeDtmTopicSafetyEcho([
      { topic: 'values', signal: 'alarming' },
      { topic: 'family', signal: 'unsettling' },
      { topic: 'finance', signal: 'reassuring' },
    ]);
    expect(alarmingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSafetyEcho([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSafetyEcho([
      { topic: 'values', signal: 'reassuring' },
      { topic: 'family', signal: 'alarming' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
