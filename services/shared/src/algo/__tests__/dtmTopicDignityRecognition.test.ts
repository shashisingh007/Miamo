import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicDignityRecognition, degradedDtmTopics } from '../dtmTopicDignityRecognition';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicDignityRecognition', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicDignityRecognition([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicDignityRecognition([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('honoring => honoring', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'honoring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('honoring');
  });

  it('respecting => acknowledging', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'respecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledging');
  });

  it('acknowledging => acknowledging', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'acknowledging' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledging');
  });

  it('dismissing => degrading', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'dismissing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('degrading');
  });

  it('degrading => degrading', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'degrading' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('degrading');
  });

  it('mixed 0.5 => dismissing', () => {
    const r = summarizeDtmTopicDignityRecognition([
      { topic: 'values', signal: 'honoring' },
      { topic: 'values', signal: 'degrading' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'x', signal: 'honoring' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicDignityRecognition([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicDignityRecognition([
      { topic: 'values', signal: 'honoring' },
      { topic: 'values', signal: 'dismissing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('degradedDtmTopics filter', () => {
    const r = summarizeDtmTopicDignityRecognition([
      { topic: 'values', signal: 'degrading' },
      { topic: 'family', signal: 'dismissing' },
      { topic: 'finance', signal: 'honoring' },
    ]);
    expect(degradedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicDignityRecognition([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicDignityRecognition([
      { topic: 'values', signal: 'honoring' },
      { topic: 'family', signal: 'degrading' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
