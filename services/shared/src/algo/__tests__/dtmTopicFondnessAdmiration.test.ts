import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicFondnessAdmiration,
  bitterDtmTopics,
} from '../dtmTopicFondnessAdmiration';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicFondnessAdmiration', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicFondnessAdmiration([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicFondnessAdmiration([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('cherished => cherished', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'cherished' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('cherished');
  });

  it('warm-fondness => fond', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'warm-fondness' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('fond');
  });

  it('positive-recall => fond', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'positive-recall' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('fond');
  });

  it('neutral-recall => bitter', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'neutral-recall' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('bitter');
  });

  it('bitter-recall => bitter', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'bitter-recall' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('bitter');
  });

  it('mixed 0.5 => neutral', () => {
    const r = summarizeDtmTopicFondnessAdmiration([
      { topic: 'family', signal: 'cherished' },
      { topic: 'family', signal: 'bitter-recall' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('neutral');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'x', signal: 'cherished' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicFondnessAdmiration([{ topic: 'family', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'family')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicFondnessAdmiration([
      { topic: 'family', signal: 'cherished' },
      { topic: 'family', signal: 'warm-fondness' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.n).toBe(2);
  });

  it('bitterDtmTopics filters', () => {
    const r = summarizeDtmTopicFondnessAdmiration([
      { topic: 'family', signal: 'bitter-recall' },
      { topic: 'intimacy', signal: 'cherished' },
    ]);
    expect(bitterDtmTopics(r)).toHaveLength(1);
    expect(bitterDtmTopics(r)[0].topic).toBe('family');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicFondnessAdmiration([
      { topic: 'family', signal: 'cherished' },
      { topic: 'intimacy', signal: 'bitter-recall' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicFondnessAdmiration([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
