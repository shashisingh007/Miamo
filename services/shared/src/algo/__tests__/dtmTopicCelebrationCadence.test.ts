import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCelebrationCadence,
  vibrantDtmTopics,
} from '../dtmTopicCelebrationCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCelebrationCadence', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicCelebrationCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCelebrationCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('milestone-marked => vibrant', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'milestone-marked' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('vibrant');
  });

  it('shared-joy (0.8) => regular', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'shared-joy' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('regular');
  });

  it('casual-cheer (0.55) => regular', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'casual-cheer' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('regular');
  });

  it('token-nod (0.25) => unmarked', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'token-nod' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('unmarked');
  });

  it('unmarked => unmarked', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'unmarked' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('unmarked');
  });

  it('mixed (0.5) => sparse', () => {
    const r = summarizeDtmTopicCelebrationCadence([
      { topic: 'leisure', signal: 'milestone-marked' },
      { topic: 'leisure', signal: 'unmarked' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('sparse');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'x', signal: 'milestone-marked' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicCelebrationCadence([{ topic: 'leisure', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCelebrationCadence([
      { topic: 'leisure', signal: 'milestone-marked' },
      { topic: 'leisure', signal: 'shared-joy' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(2);
  });

  it('vibrantDtmTopics filters', () => {
    const r = summarizeDtmTopicCelebrationCadence([
      { topic: 'leisure', signal: 'milestone-marked' },
      { topic: 'intimacy', signal: 'token-nod' },
    ]);
    expect(vibrantDtmTopics(r)).toHaveLength(1);
    expect(vibrantDtmTopics(r)[0].topic).toBe('leisure');
  });

  it('score bounded', () => {
    const r = summarizeDtmTopicCelebrationCadence([
      { topic: 'leisure', signal: 'milestone-marked' },
      { topic: 'intimacy', signal: 'unmarked' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicCelebrationCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
