import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAcceptanceCapacity, rejectingDtmTopics } from '../dtmTopicAcceptanceCapacity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAcceptanceCapacity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAcceptanceCapacity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('embracing => accepting', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'embracing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accepting');
  });

  it('accepting => tolerating', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'accepting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tolerating');
  });

  it('tolerating => tolerating', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'tolerating' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tolerating');
  });

  it('resisting => rejecting', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'resisting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('rejecting => rejecting', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'rejecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('mixed 0.5 => resisting', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([
      { topic: 'values', signal: 'embracing' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resisting');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'x', signal: 'embracing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([
      { topic: 'values', signal: 'embracing' },
      { topic: 'values', signal: 'resisting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('rejectingDtmTopics filters', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([
      { topic: 'values', signal: 'rejecting' },
      { topic: 'family', signal: 'resisting' },
      { topic: 'finance', signal: 'embracing' },
    ]);
    expect(rejectingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAcceptanceCapacity([
      { topic: 'values', signal: 'embracing' },
      { topic: 'family', signal: 'rejecting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
