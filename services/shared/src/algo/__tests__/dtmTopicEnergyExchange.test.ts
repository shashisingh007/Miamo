import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEnergyExchange,
  depletingDtmTopics,
} from '../dtmTopicEnergyExchange';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEnergyExchange', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicEnergyExchange([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicEnergyExchange([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('reciprocal => flowing', () => {
    const rows = summarizeDtmTopicEnergyExchange([{ topic: 'intimacy', direction: 'reciprocal' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('flowing');
  });

  it('extract => depleting', () => {
    const rows = summarizeDtmTopicEnergyExchange([{ topic: 'intimacy', direction: 'extract' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('depleting');
  });

  it('all give => lopsided (0.5)', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'give' },
      { topic: 'intimacy', direction: 'give' },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('lopsided');
  });

  it('all receive => lopsided (0.5)', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'receive' },
      { topic: 'intimacy', direction: 'receive' },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('lopsided');
  });

  it('mostly reciprocal => flowing', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'reciprocal' },
      { topic: 'intimacy', direction: 'reciprocal' },
      { topic: 'intimacy', direction: 'reciprocal' },
      { topic: 'intimacy', direction: 'give' },
    ]);
    const r = rows.find((x) => x.topic === 'intimacy')!;
    expect(r.reciprocityRatio).toBeCloseTo((1 + 1 + 1 + 0.5) / 4, 5);
    expect(r.band).toBe('flowing');
  });

  it('magnitude scales contribution', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'reciprocal', magnitude: 0 },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.reciprocityRatio).toBe(0);
  });

  it('magnitude clamps to [0,1]', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'reciprocal', magnitude: 5 },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.reciprocityRatio).toBe(1);
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicEnergyExchange([{ topic: 'nope', direction: 'give' }]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown direction', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'sneaky' as any },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'reciprocal' },
      { topic: 'intimacy', direction: 'give' },
      { topic: 'family', direction: 'extract' },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('depletingDtmTopics filters', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'extract' },
      { topic: 'family', direction: 'reciprocal' },
    ]);
    const d = depletingDtmTopics(rows);
    expect(d).toHaveLength(1);
    expect(d[0].topic).toBe('intimacy');
  });

  it('ratio is bounded in [0,1]', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'intimacy', direction: 'reciprocal' },
      { topic: 'family', direction: 'extract' },
    ]);
    for (const r of rows) {
      expect(r.reciprocityRatio).toBeGreaterThanOrEqual(0);
      expect(r.reciprocityRatio).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicEnergyExchange([
      { topic: 'future', direction: 'reciprocal' },
      { topic: 'values', direction: 'extract' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
