import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHumorTone,
  cuttingDtmTopics,
} from '../dtmTopicHumorTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHumorTone', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicHumorTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicHumorTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('shared-laughter => warm', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'shared-laughter' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('warm');
  });

  it('gentle-tease (0.8) => neutral', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'gentle-tease' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('neutral');
  });

  it('neutral-joke (0.55) => neutral', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'neutral-joke' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('neutral');
  });

  it('edgy-joke (0.25) => cutting', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'edgy-joke' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('cutting');
  });

  it('cutting-mock => cutting', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'cutting-mock' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('cutting');
  });

  it('mixed shared + mock (0.5) => edgy', () => {
    const r = summarizeDtmTopicHumorTone([
      { topic: 'leisure', signal: 'shared-laughter' },
      { topic: 'leisure', signal: 'cutting-mock' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('edgy');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'xx', signal: 'shared-laughter' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicHumorTone([{ topic: 'leisure', signal: 'xyz' as any }]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHumorTone([
      { topic: 'leisure', signal: 'shared-laughter' },
      { topic: 'leisure', signal: 'edgy-joke' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(2);
  });

  it('cuttingDtmTopics filters', () => {
    const r = summarizeDtmTopicHumorTone([
      { topic: 'leisure', signal: 'cutting-mock' },
      { topic: 'family', signal: 'shared-laughter' },
    ]);
    const c = cuttingDtmTopics(r);
    expect(c).toHaveLength(1);
    expect(c[0].topic).toBe('leisure');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicHumorTone([
      { topic: 'leisure', signal: 'shared-laughter' },
      { topic: 'family', signal: 'cutting-mock' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicHumorTone([
      { topic: 'future', signal: 'shared-laughter' },
      { topic: 'values', signal: 'cutting-mock' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
