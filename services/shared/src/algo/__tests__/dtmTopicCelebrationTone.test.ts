import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCelebrationTone, dismissiveDtmTopics } from '../dtmTopicCelebrationTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCelebrationTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCelebrationTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCelebrationTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('celebratory', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'celebratory' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('celebratory');
  });

  it('enthusiastic => mixed', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'enthusiastic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat => dismissive', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('dismissive', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'dismissive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('mid => flat', () => {
    const r = summarizeDtmTopicCelebrationTone([
      { topic: 'values', signal: 'celebratory' },
      { topic: 'values', signal: 'dismissive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'x', signal: 'celebratory' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCelebrationTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCelebrationTone([
      { topic: 'values', signal: 'celebratory' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dismissiveDtmTopics filter', () => {
    const r = summarizeDtmTopicCelebrationTone([
      { topic: 'values', signal: 'dismissive' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'celebratory' },
    ]);
    expect(dismissiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCelebrationTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCelebrationTone([
      { topic: 'values', signal: 'celebratory' },
      { topic: 'family', signal: 'dismissive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
