import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicLevityCadence, leadenDtmTopics } from '../dtmTopicLevityCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicLevityCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicLevityCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicLevityCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('buoyant => light', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'buoyant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('light');
  });

  it('light => mixed', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'light' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('heavy => leaden', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'heavy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('leaden');
  });

  it('leaden', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'leaden' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('leaden');
  });

  it('mid', () => {
    const r = summarizeDtmTopicLevityCadence([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'values', signal: 'leaden' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('heavy');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'x', signal: 'buoyant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicLevityCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicLevityCadence([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'values', signal: 'leaden' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('leadenDtmTopics filter', () => {
    const r = summarizeDtmTopicLevityCadence([
      { topic: 'values', signal: 'leaden' },
      { topic: 'family', signal: 'heavy' },
      { topic: 'finance', signal: 'buoyant' },
    ]);
    expect(leadenDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicLevityCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicLevityCadence([
      { topic: 'values', signal: 'buoyant' },
      { topic: 'family', signal: 'leaden' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
