import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGroundednessQuality, unmooredDtmTopics } from '../dtmTopicGroundednessQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGroundednessQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGroundednessQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGroundednessQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('rooted => grounded', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'rooted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grounded');
  });

  it('grounded => settling', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'grounded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('settling');
  });

  it('settling => settling', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'settling' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('settling');
  });

  it('unsteady => unmoored', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'unsteady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unmoored');
  });

  it('unmoored => unmoored', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'unmoored' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unmoored');
  });

  it('mixed 0.5 => unsteady', () => {
    const r = summarizeDtmTopicGroundednessQuality([
      { topic: 'values', signal: 'rooted' },
      { topic: 'values', signal: 'unmoored' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unsteady');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'x', signal: 'rooted' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGroundednessQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGroundednessQuality([
      { topic: 'values', signal: 'rooted' },
      { topic: 'values', signal: 'unsteady' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unmooredDtmTopics filters', () => {
    const r = summarizeDtmTopicGroundednessQuality([
      { topic: 'values', signal: 'unmoored' },
      { topic: 'family', signal: 'unsteady' },
      { topic: 'finance', signal: 'rooted' },
    ]);
    expect(unmooredDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicGroundednessQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGroundednessQuality([
      { topic: 'values', signal: 'rooted' },
      { topic: 'family', signal: 'unmoored' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
