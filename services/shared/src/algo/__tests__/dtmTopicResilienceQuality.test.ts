import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicResilienceQuality, brittleDtmTopics } from '../dtmTopicResilienceQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicResilienceQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicResilienceQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicResilienceQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('resilient => resilient', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'resilient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resilient');
  });

  it('sturdy => mixed', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'sturdy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('fragile => brittle', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'fragile' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('brittle');
  });

  it('brittle => brittle', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'brittle' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('brittle');
  });

  it('mixed midpoint => fragile', () => {
    const r = summarizeDtmTopicResilienceQuality([
      { topic: 'values', signal: 'resilient' },
      { topic: 'values', signal: 'brittle' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('fragile');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'x', signal: 'resilient' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicResilienceQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicResilienceQuality([
      { topic: 'values', signal: 'resilient' },
      { topic: 'values', signal: 'fragile' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('brittleDtmTopics filter', () => {
    const r = summarizeDtmTopicResilienceQuality([
      { topic: 'values', signal: 'brittle' },
      { topic: 'family', signal: 'fragile' },
      { topic: 'finance', signal: 'resilient' },
    ]);
    expect(brittleDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicResilienceQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicResilienceQuality([
      { topic: 'values', signal: 'resilient' },
      { topic: 'family', signal: 'brittle' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
