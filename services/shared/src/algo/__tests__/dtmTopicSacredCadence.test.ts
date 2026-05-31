import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSacredCadence,
  profanedDtmTopics,
} from '../dtmTopicSacredCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSacredCadence', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicSacredCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSacredCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('devoted => sacred', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'devoted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sacred');
  });

  it('honored (0.8) => noted', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'honored' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('noted');
  });

  it('noted => noted', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'noted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('noted');
  });

  it('forgotten => profaned', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'forgotten' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('profaned');
  });

  it('profaned => profaned', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'profaned' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('profaned');
  });

  it('mixed 0.5 => forgotten', () => {
    const r = summarizeDtmTopicSacredCadence([
      { topic: 'values', signal: 'devoted' },
      { topic: 'values', signal: 'profaned' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('forgotten');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'q', signal: 'devoted' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSacredCadence([{ topic: 'values', signal: 'x' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSacredCadence([
      { topic: 'values', signal: 'honored' },
      { topic: 'values', signal: 'noted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('profanedDtmTopics filters', () => {
    const r = summarizeDtmTopicSacredCadence([
      { topic: 'values', signal: 'profaned' },
      { topic: 'family', signal: 'forgotten' },
      { topic: 'finance', signal: 'devoted' },
    ]);
    expect(profanedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSacredCadence([
      { topic: 'values', signal: 'devoted' },
      { topic: 'family', signal: 'profaned' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSacredCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
