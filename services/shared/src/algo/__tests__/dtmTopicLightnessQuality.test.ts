import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicLightnessQuality, leadenDtmTopics } from '../dtmTopicLightnessQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicLightnessQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicLightnessQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicLightnessQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('buoyant => buoyant', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'buoyant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('buoyant');
  });

  it('playful => easy', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'playful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('easy');
  });

  it('easy => easy', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'easy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('easy');
  });

  it('weighty => leaden', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'weighty' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('leaden');
  });

  it('leaden => leaden', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'leaden' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('leaden');
  });

  it('mixed 0.5 => weighty', () => {
    const r = summarizeDtmTopicLightnessQuality([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'values', signal: 'leaden' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('weighty');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'x', signal: 'buoyant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicLightnessQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicLightnessQuality([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'values', signal: 'weighty' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('leadenDtmTopics filter', () => {
    const r = summarizeDtmTopicLightnessQuality([
      { topic: 'values', signal: 'leaden' },
      { topic: 'family', signal: 'weighty' },
      { topic: 'finance', signal: 'buoyant' },
    ]);
    expect(leadenDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicLightnessQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicLightnessQuality([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'family', signal: 'leaden' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
