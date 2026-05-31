import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSerenityQuality, turbulentDtmTopics } from '../dtmTopicSerenityQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSerenityQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSerenityQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSerenityQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('serene => calm', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'serene' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('calm');
  });

  it('calm => mixed', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'calm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('unsettled => turbulent', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'unsettled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('turbulent');
  });

  it('turbulent => turbulent', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'turbulent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('turbulent');
  });

  it('mixed midpoint => unsettled', () => {
    const r = summarizeDtmTopicSerenityQuality([
      { topic: 'values', signal: 'serene' },
      { topic: 'values', signal: 'turbulent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unsettled');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'x', signal: 'serene' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSerenityQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSerenityQuality([
      { topic: 'values', signal: 'serene' },
      { topic: 'values', signal: 'unsettled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('turbulentDtmTopics filter', () => {
    const r = summarizeDtmTopicSerenityQuality([
      { topic: 'values', signal: 'turbulent' },
      { topic: 'family', signal: 'unsettled' },
      { topic: 'finance', signal: 'serene' },
    ]);
    expect(turbulentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSerenityQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSerenityQuality([
      { topic: 'values', signal: 'serene' },
      { topic: 'family', signal: 'turbulent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
