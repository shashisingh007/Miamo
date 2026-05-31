import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAcceptanceWillingness, rejectingDtmTopics } from '../dtmTopicAcceptanceWillingness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAcceptanceWillingness', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAcceptanceWillingness([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('embracing', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'embracing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('embracing');
  });

  it('accepting => mixed', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'accepting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('reluctant => rejecting', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'reluctant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('rejecting', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'rejecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([
      { topic: 'values', signal: 'embracing' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reluctant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'x', signal: 'embracing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([
      { topic: 'values', signal: 'embracing' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('rejectingDtmTopics filter', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([
      { topic: 'values', signal: 'rejecting' },
      { topic: 'family', signal: 'reluctant' },
      { topic: 'finance', signal: 'embracing' },
    ]);
    expect(rejectingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAcceptanceWillingness([
      { topic: 'values', signal: 'embracing' },
      { topic: 'family', signal: 'rejecting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
