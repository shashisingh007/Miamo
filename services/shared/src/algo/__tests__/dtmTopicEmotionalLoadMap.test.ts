import { describe, it, expect } from 'vitest';
import {
  mapDtmTopicEmotionalLoad,
  topDtmEmotionalLoadTopics,
} from '../dtmTopicEmotionalLoadMap';

describe('dtmTopicEmotionalLoadMap', () => {
  it('returns empty for empty input', () => {
    expect(mapDtmTopicEmotionalLoad([])).toEqual([]);
  });

  it('ignores unknown topics', () => {
    expect(
      mapDtmTopicEmotionalLoad([{ topic: 'banana', self: 0.5, partner: 0.5 }])
    ).toEqual([]);
  });

  it('drops samples with non-finite ratings', () => {
    expect(
      mapDtmTopicEmotionalLoad([
        { topic: 'values', self: Number.NaN, partner: 0.5 },
      ])
    ).toEqual([]);
  });

  it('clamps out-of-range ratings', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'family', self: 5, partner: -5 },
    ]);
    expect(rows[0].intensity).toBe(1);
    expect(rows[0].gap).toBe(1);
  });

  it('light band when neutral and no conflict', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'leisure', self: 0.1, partner: 0.1 },
      { topic: 'leisure', self: 0.0, partner: 0.0 },
    ]);
    expect(rows[0].band).toBe('light');
    expect(rows[0].conflictRate).toBe(0);
  });

  it('critical band when strong gap + conflict', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'conflict', self: 1, partner: -1, conflict: true },
      { topic: 'conflict', self: 1, partner: -1, conflict: true },
    ]);
    expect(rows[0].band).toBe('critical');
    expect(rows[0].conflictRate).toBe(1);
  });

  it('moderate band on mid-intensity disagreement', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'finance', self: 0.7, partner: 0.4, conflict: true },
      { topic: 'finance', self: 0.6, partner: 0.5 },
    ]);
    expect(rows[0].band).toBe('moderate');
  });

  it('heavy band when intensity high and conflict present', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'intimacy', self: 1, partner: 0.9, conflict: true },
      { topic: 'intimacy', self: 1, partner: 0.9, conflict: true },
    ]);
    expect(rows[0].band).toBe('heavy');
  });

  it('conflictRate is fraction across samples', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'health', self: 0.5, partner: 0.5, conflict: true },
      { topic: 'health', self: 0.5, partner: 0.5, conflict: false },
      { topic: 'health', self: 0.5, partner: 0.5, conflict: false },
      { topic: 'health', self: 0.5, partner: 0.5, conflict: false },
    ]);
    expect(rows[0].conflictRate).toBe(0.25);
  });

  it('preserves canonical topic order', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'future', self: 0.5, partner: 0.5 },
      { topic: 'values', self: 0.5, partner: 0.5 },
    ]);
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('load stays in [0, 1]', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'parenting', self: 1, partner: -1, conflict: true },
      { topic: 'growth', self: 0, partner: 0 },
    ]);
    for (const r of rows) {
      expect(r.load).toBeGreaterThanOrEqual(0);
      expect(r.load).toBeLessThanOrEqual(1);
    }
  });

  it('topDtmEmotionalLoadTopics ranks by load desc', () => {
    const rows = mapDtmTopicEmotionalLoad([
      { topic: 'leisure', self: 0.1, partner: 0.1 },
      { topic: 'conflict', self: 1, partner: -1, conflict: true },
    ]);
    const top = topDtmEmotionalLoadTopics(rows, 1);
    expect(top[0].topic).toBe('conflict');
  });

  it('topDtmEmotionalLoadTopics returns [] for k<=0', () => {
    expect(topDtmEmotionalLoadTopics([], 0)).toEqual([]);
  });
});
