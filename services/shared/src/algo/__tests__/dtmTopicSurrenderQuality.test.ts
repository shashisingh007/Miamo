import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSurrenderQuality, clenchedDtmTopics } from '../dtmTopicSurrenderQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSurrenderQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSurrenderQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSurrenderQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('yielding => yielding', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'yielding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('yielding');
  });

  it('releasing => softening', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'releasing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('softening');
  });

  it('softening => softening', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'softening' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('softening');
  });

  it('gripping => clenching', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'gripping' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('clenching');
  });

  it('clenching => clenching', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'clenching' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('clenching');
  });

  it('mixed 0.5 => gripping', () => {
    const r = summarizeDtmTopicSurrenderQuality([
      { topic: 'values', signal: 'yielding' },
      { topic: 'values', signal: 'clenching' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('gripping');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'x', signal: 'yielding' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSurrenderQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSurrenderQuality([
      { topic: 'values', signal: 'yielding' },
      { topic: 'values', signal: 'gripping' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('clenchedDtmTopics filter', () => {
    const r = summarizeDtmTopicSurrenderQuality([
      { topic: 'values', signal: 'clenching' },
      { topic: 'family', signal: 'gripping' },
      { topic: 'finance', signal: 'yielding' },
    ]);
    expect(clenchedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSurrenderQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSurrenderQuality([
      { topic: 'values', signal: 'yielding' },
      { topic: 'family', signal: 'clenching' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
