import { describe, it, expect } from 'vitest';
import {
  scoreDtmTopicConsistency,
  overallDtmConsistency,
} from '../dtmTopicConsistencyScore';

describe('dtmTopicConsistencyScore', () => {
  it('returns empty when no samples match canonical topics', () => {
    expect(scoreDtmTopicConsistency([{ topic: 'not_a_topic', value: 0.5 }])).toEqual([]);
  });

  it('marks single-sample topic as unknown band', () => {
    const rows = scoreDtmTopicConsistency([{ topic: 'values', value: 0.4 }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].band).toBe('unknown');
    expect(rows[0].stddev).toBe(0);
    expect(rows[0].consistency).toBe(1);
  });

  it('perfectly identical values → consistency 1 / high band', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'family', value: 0.5 },
      { topic: 'family', value: 0.5 },
      { topic: 'family', value: 0.5 },
    ]);
    expect(rows[0].consistency).toBe(1);
    expect(rows[0].band).toBe('high');
  });

  it('high spread → low band', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'conflict', value: -1 },
      { topic: 'conflict', value: 1 },
      { topic: 'conflict', value: -1 },
      { topic: 'conflict', value: 1 },
    ]);
    expect(rows[0].band).toBe('low');
    expect(rows[0].consistency).toBeLessThan(0.6);
  });

  it('moderate spread → medium band', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'leisure', value: -0.2 },
      { topic: 'leisure', value: 0.6 },
      { topic: 'leisure', value: 0.0 },
      { topic: 'leisure', value: -0.4 },
    ]);
    expect(rows[0].band).toBe('medium');
  });

  it('clamps out-of-range values', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'growth', value: 5 },
      { topic: 'growth', value: 5 },
    ]);
    expect(rows[0].mean).toBe(1);
    expect(rows[0].stddev).toBe(0);
  });

  it('ignores non-finite values', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'health', value: 0.3 },
      { topic: 'health', value: Number.NaN },
      { topic: 'health', value: 0.3 },
    ]);
    expect(rows[0].samples).toBe(2);
    expect(rows[0].stddev).toBe(0);
  });

  it('preserves canonical topic order in output', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'future', value: 0.1 },
      { topic: 'future', value: 0.2 },
      { topic: 'values', value: 0.0 },
      { topic: 'values', value: 0.0 },
    ]);
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('overall ignores unknown-band rows', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'values', value: 0.5 }, // single → unknown
      { topic: 'family', value: 0.5 },
      { topic: 'family', value: 0.5 },
    ]);
    expect(overallDtmConsistency(rows)).toBe(1);
  });

  it('overall returns 0 when no scorable rows', () => {
    expect(overallDtmConsistency([])).toBe(0);
    const rows = scoreDtmTopicConsistency([{ topic: 'values', value: 0.1 }]);
    expect(overallDtmConsistency(rows)).toBe(0);
  });

  it('overall averages consistency across scorable rows', () => {
    const rows = scoreDtmTopicConsistency([
      { topic: 'values', value: 0.5 },
      { topic: 'values', value: 0.5 },
      { topic: 'family', value: -1 },
      { topic: 'family', value: 1 },
    ]);
    const avg = overallDtmConsistency(rows);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(1);
  });
});
