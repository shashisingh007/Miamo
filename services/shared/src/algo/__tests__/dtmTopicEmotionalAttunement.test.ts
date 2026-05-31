import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEmotionalAttunement,
  dismissiveDtmTopics,
} from '../dtmTopicEmotionalAttunement';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEmotionalAttunement', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicEmotionalAttunement([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicEmotionalAttunement([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('mirrored-feeling => attuned', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'mirrored-feeling' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('attuned');
  });

  it('named-feeling (0.8) => present', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'named-feeling' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('present');
  });

  it('acknowledged (0.55) => present', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'acknowledged' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('present');
  });

  it('minimized (0.2) => dismissive', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'minimized' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('dismissive');
  });

  it('dismissed => dismissive', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'dismissed' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('dismissive');
  });

  it('mixed mirrored + dismissed (0.5) => shallow', () => {
    const r = summarizeDtmTopicEmotionalAttunement([
      { topic: 'intimacy', signal: 'mirrored-feeling' },
      { topic: 'intimacy', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('shallow');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'nope', signal: 'mirrored-feeling' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicEmotionalAttunement([{ topic: 'intimacy', signal: 'xyz' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEmotionalAttunement([
      { topic: 'intimacy', signal: 'mirrored-feeling' },
      { topic: 'intimacy', signal: 'acknowledged' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('dismissiveDtmTopics filters', () => {
    const r = summarizeDtmTopicEmotionalAttunement([
      { topic: 'intimacy', signal: 'dismissed' },
      { topic: 'family', signal: 'mirrored-feeling' },
    ]);
    const d = dismissiveDtmTopics(r);
    expect(d).toHaveLength(1);
    expect(d[0].topic).toBe('intimacy');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicEmotionalAttunement([
      { topic: 'intimacy', signal: 'mirrored-feeling' },
      { topic: 'family', signal: 'dismissed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicEmotionalAttunement([
      { topic: 'future', signal: 'mirrored-feeling' },
      { topic: 'values', signal: 'dismissed' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
