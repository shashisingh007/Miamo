import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReverenceCadence, profaneDtmTopics } from '../dtmTopicReverenceCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReverenceCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReverenceCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReverenceCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('sacred => reverent', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'sacred' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reverent');
  });

  it('reverent => respectful', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'reverent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('respectful');
  });

  it('respectful => respectful', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'respectful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('respectful');
  });

  it('casual => profane', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'casual' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('profane');
  });

  it('profane => profane', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'profane' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('profane');
  });

  it('mixed 0.5 => casual', () => {
    const r = summarizeDtmTopicReverenceCadence([
      { topic: 'values', signal: 'sacred' },
      { topic: 'values', signal: 'profane' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('casual');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'x', signal: 'sacred' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReverenceCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReverenceCadence([
      { topic: 'values', signal: 'sacred' },
      { topic: 'values', signal: 'casual' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('profaneDtmTopics filters', () => {
    const r = summarizeDtmTopicReverenceCadence([
      { topic: 'values', signal: 'profane' },
      { topic: 'family', signal: 'casual' },
      { topic: 'finance', signal: 'sacred' },
    ]);
    expect(profaneDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicReverenceCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReverenceCadence([
      { topic: 'values', signal: 'sacred' },
      { topic: 'family', signal: 'profane' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
