import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSilenceQuality,
  shutdownDtmTopics,
} from '../dtmTopicSilenceQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSilenceQuality', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicSilenceQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSilenceQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('restorative-quiet => restorative', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'restorative-quiet' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('restorative');
  });

  it('comfortable-pause => neutral', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'comfortable-pause' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('neutral');
  });

  it('neutral-gap => neutral', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'neutral-gap' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('neutral');
  });

  it('awkward-pause => shutdown', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'awkward-pause' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('shutdown');
  });

  it('cold-shutdown => shutdown', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'cold-shutdown' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('shutdown');
  });

  it('mixed 0.5 => awkward', () => {
    const r = summarizeDtmTopicSilenceQuality([
      { topic: 'communication', signal: 'restorative-quiet' },
      { topic: 'communication', signal: 'cold-shutdown' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('awkward');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'x', signal: 'restorative-quiet' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSilenceQuality([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSilenceQuality([
      { topic: 'communication', signal: 'restorative-quiet' },
      { topic: 'communication', signal: 'comfortable-pause' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('shutdownDtmTopics filters', () => {
    const r = summarizeDtmTopicSilenceQuality([
      { topic: 'communication', signal: 'cold-shutdown' },
      { topic: 'family', signal: 'restorative-quiet' },
    ]);
    expect(shutdownDtmTopics(r)).toHaveLength(1);
    expect(shutdownDtmTopics(r)[0].topic).toBe('communication');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSilenceQuality([
      { topic: 'communication', signal: 'restorative-quiet' },
      { topic: 'family', signal: 'cold-shutdown' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicSilenceQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
