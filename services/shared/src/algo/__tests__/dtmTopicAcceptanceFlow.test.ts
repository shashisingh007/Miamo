import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAcceptanceFlow, rejectingDtmTopics } from '../dtmTopicAcceptanceFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAcceptanceFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAcceptanceFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAcceptanceFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('accepting => accepting', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'accepting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accepting');
  });

  it('tolerant => mixed', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'tolerant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('resistant => rejecting', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'resistant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('rejecting => rejecting', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'rejecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('mid => resistant', () => {
    const r = summarizeDtmTopicAcceptanceFlow([
      { topic: 'values', signal: 'accepting' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resistant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'x', signal: 'accepting' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAcceptanceFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAcceptanceFlow([
      { topic: 'values', signal: 'accepting' },
      { topic: 'values', signal: 'resistant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('rejectingDtmTopics filter', () => {
    const r = summarizeDtmTopicAcceptanceFlow([
      { topic: 'values', signal: 'rejecting' },
      { topic: 'family', signal: 'resistant' },
      { topic: 'finance', signal: 'accepting' },
    ]);
    expect(rejectingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAcceptanceFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAcceptanceFlow([
      { topic: 'values', signal: 'accepting' },
      { topic: 'family', signal: 'rejecting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
