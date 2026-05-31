import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicWhollyHeldQuality,
  unheldDtmTopics,
} from '../dtmTopicWhollyHeldQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWhollyHeldQuality', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWhollyHeldQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-held => wholly-held', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'fully-held' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wholly-held');
  });

  it('embraced (0.8) => supported', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'embraced' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('supported');
  });

  it('supported => supported', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'supported' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('supported');
  });

  it('partial-hold => unheld', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'partial-hold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unheld');
  });

  it('unheld => unheld', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'unheld' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unheld');
  });

  it('mixed 0.5 => partial-hold', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([
      { topic: 'values', signal: 'fully-held' },
      { topic: 'values', signal: 'unheld' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial-hold');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'q', signal: 'fully-held' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([{ topic: 'values', signal: 'x' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([
      { topic: 'values', signal: 'embraced' },
      { topic: 'values', signal: 'supported' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unheldDtmTopics filters', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([
      { topic: 'values', signal: 'unheld' },
      { topic: 'family', signal: 'partial-hold' },
      { topic: 'finance', signal: 'fully-held' },
    ]);
    expect(unheldDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([
      { topic: 'values', signal: 'fully-held' },
      { topic: 'family', signal: 'unheld' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicWhollyHeldQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
