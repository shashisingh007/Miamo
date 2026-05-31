import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTimePresence,
  absentDtmTopics,
} from '../dtmTopicTimePresence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTimePresence', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicTimePresence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicTimePresence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-present => present', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'fully-present' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('present');
  });

  it('mostly-present (0.8) => partial', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'mostly-present' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('partial');
  });

  it('partially-present (0.55) => partial', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'partially-present' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('partial');
  });

  it('distracted (0.25) => absent', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('absent');
  });

  it('mixed full + absent (0.5) => distracted', () => {
    const r = summarizeDtmTopicTimePresence([
      { topic: 'leisure', signal: 'fully-present' },
      { topic: 'leisure', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('distracted');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'xx', signal: 'fully-present' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicTimePresence([{ topic: 'leisure', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTimePresence([
      { topic: 'leisure', signal: 'fully-present' },
      { topic: 'leisure', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(2);
  });

  it('absentDtmTopics filters', () => {
    const r = summarizeDtmTopicTimePresence([
      { topic: 'leisure', signal: 'absent' },
      { topic: 'family', signal: 'fully-present' },
    ]);
    expect(absentDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicTimePresence([
      { topic: 'leisure', signal: 'fully-present' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicTimePresence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
