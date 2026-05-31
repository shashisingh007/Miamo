import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHoldingEnvironment,
  abandoningDtmTopics,
} from '../dtmTopicHoldingEnvironment';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHoldingEnvironment', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicHoldingEnvironment([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHoldingEnvironment([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deeply-held => held', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'communication', signal: 'deeply-held' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('held');
  });

  it('held (0.8) => tentative', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'communication', signal: 'held' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('tentative');
  });

  it('tentative => tentative', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'communication', signal: 'tentative' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('tentative');
  });

  it('unheld => abandoning', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'communication', signal: 'unheld' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('abandoning');
  });

  it('abandoning => abandoning', () => {
    const r = summarizeDtmTopicHoldingEnvironment([
      { topic: 'communication', signal: 'abandoning' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('abandoning');
  });

  it('mixed 0.5 => unheld', () => {
    const r = summarizeDtmTopicHoldingEnvironment([
      { topic: 'communication', signal: 'deeply-held' },
      { topic: 'communication', signal: 'abandoning' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('unheld');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'x', signal: 'deeply-held' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHoldingEnvironment([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHoldingEnvironment([
      { topic: 'communication', signal: 'deeply-held' },
      { topic: 'communication', signal: 'held' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('abandoningDtmTopics filters both bands', () => {
    const r = summarizeDtmTopicHoldingEnvironment([
      { topic: 'communication', signal: 'abandoning' },
      { topic: 'family', signal: 'unheld' },
      { topic: 'finance', signal: 'deeply-held' },
    ]);
    expect(abandoningDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHoldingEnvironment([
      { topic: 'communication', signal: 'deeply-held' },
      { topic: 'family', signal: 'abandoning' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicHoldingEnvironment([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
