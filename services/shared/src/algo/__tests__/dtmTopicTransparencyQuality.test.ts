import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTransparencyQuality, opaqueDtmTopics } from '../dtmTopicTransparencyQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTransparencyQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTransparencyQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTransparencyQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('transparent', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'transparent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('transparent');
  });

  it('open => mixed', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded => opaque', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('opaque');
  });

  it('opaque', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'opaque' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('opaque');
  });

  it('mid => guarded', () => {
    const r = summarizeDtmTopicTransparencyQuality([
      { topic: 'values', signal: 'transparent' },
      { topic: 'values', signal: 'opaque' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'x', signal: 'transparent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTransparencyQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTransparencyQuality([
      { topic: 'values', signal: 'transparent' },
      { topic: 'values', signal: 'guarded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('opaqueDtmTopics filter', () => {
    const r = summarizeDtmTopicTransparencyQuality([
      { topic: 'values', signal: 'opaque' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'transparent' },
    ]);
    expect(opaqueDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTransparencyQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTransparencyQuality([
      { topic: 'values', signal: 'transparent' },
      { topic: 'family', signal: 'opaque' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
