import { describe, it, expect } from 'vitest';
import {
  mapDtmTopicResonance,
  topDtmResonanceTopics,
} from '../dtmTopicResonanceMap';

describe('dtmTopicResonanceMap', () => {
  it('ignores unknown topics', () => {
    expect(
      mapDtmTopicResonance([{ topic: 'banana', self: 0.5, partner: 0.5 }])
    ).toEqual([]);
  });

  it('drops entries with non-finite ratings', () => {
    expect(
      mapDtmTopicResonance([{ topic: 'values', self: Number.NaN, partner: 0.5 }])
    ).toEqual([]);
  });

  it('clamps out-of-range values', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'family', self: 5, partner: -5 },
    ]);
    expect(row.self).toBe(1);
    expect(row.partner).toBe(-1);
  });

  it('shared_passion when both strongly positive and agreeing', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'intimacy', self: 0.9, partner: 0.85 },
    ]);
    expect(row.band).toBe('shared_passion');
    expect(row.resonance).toBeGreaterThan(0.5);
  });

  it('shared_mild when agreement is high but intensity is moderate', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'leisure', self: 0.4, partner: 0.4 },
    ]);
    expect(row.band).toBe('shared_mild');
  });

  it('shared_indifference when both near zero', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'social', self: 0.05, partner: -0.05 },
    ]);
    expect(row.band).toBe('shared_indifference');
  });

  it('one_sided when intensity is high but agreement is medium', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'finance', self: 0.9, partner: 0.2 },
    ]);
    expect(row.band).toBe('one_sided');
  });

  it('conflict when ratings move opposite directions strongly', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'conflict', self: 0.9, partner: -0.9 },
    ]);
    expect(row.band).toBe('conflict');
    expect(row.resonance).toBe(0); // opposite polarities → meanPolarity 0
  });

  it('negative shared polarity yields negative resonance', () => {
    const [row] = mapDtmTopicResonance([
      { topic: 'parenting', self: -0.8, partner: -0.7 },
    ]);
    expect(row.resonance).toBeLessThan(0);
    // both strongly negative ⇒ shared but on the dislike side → shared_mild
    expect(['shared_mild', 'shared_passion']).toContain(row.band);
  });

  it('agreement, intensity, resonance are within [0,1] / [-1,1]', () => {
    const rows = mapDtmTopicResonance([
      { topic: 'growth', self: 0.6, partner: 0.4 },
      { topic: 'health', self: -0.6, partner: -0.5 },
    ]);
    for (const r of rows) {
      expect(r.intensity).toBeGreaterThanOrEqual(0);
      expect(r.intensity).toBeLessThanOrEqual(1);
      expect(r.agreement).toBeGreaterThanOrEqual(0);
      expect(r.agreement).toBeLessThanOrEqual(1);
      expect(r.resonance).toBeGreaterThanOrEqual(-1);
      expect(r.resonance).toBeLessThanOrEqual(1);
    }
  });

  it('preserves canonical topic order', () => {
    const rows = mapDtmTopicResonance([
      { topic: 'future', self: 0.5, partner: 0.5 },
      { topic: 'values', self: 0.5, partner: 0.5 },
    ]);
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('topDtmResonanceTopics ranks by descending resonance', () => {
    const rows = mapDtmTopicResonance([
      { topic: 'leisure', self: 0.4, partner: 0.4 },
      { topic: 'intimacy', self: 0.9, partner: 0.9 },
      { topic: 'conflict', self: 0.9, partner: -0.9 },
    ]);
    const top = topDtmResonanceTopics(rows, 1);
    expect(top[0].topic).toBe('intimacy');
  });

  it('topDtmResonanceTopics returns [] for k<=0', () => {
    expect(topDtmResonanceTopics([], 0)).toEqual([]);
  });
});
