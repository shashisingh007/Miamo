import { describe, it, expect } from 'vitest';
import { downsampleTimeSeries } from '../timeSeriesDownsampler';

describe('timeSeriesDownsampler', () => {
  it('throws on bad bucketMs', () => {
    expect(() => downsampleTimeSeries([], { bucketMs: 0 })).toThrow();
    expect(() => downsampleTimeSeries([], { bucketMs: -1 })).toThrow();
  });

  it('empty input => empty output (no range)', () => {
    expect(downsampleTimeSeries([], { bucketMs: 100 })).toEqual([]);
  });

  it('mean aggregation aligns to epoch', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 0, value: 2 },
        { ts: 50, value: 4 },
        { ts: 100, value: 10 },
      ],
      { bucketMs: 100, aggregation: 'mean' }
    );
    expect(r).toEqual([
      { ts: 0, value: 3 },
      { ts: 100, value: 10 },
    ]);
  });

  it('sum aggregation', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 0, value: 1 },
        { ts: 10, value: 2 },
        { ts: 20, value: 3 },
      ],
      { bucketMs: 100, aggregation: 'sum' }
    );
    expect(r).toEqual([{ ts: 0, value: 6 }]);
  });

  it('min/max aggregations', () => {
    const data = [
      { ts: 0, value: 5 },
      { ts: 10, value: 1 },
      { ts: 20, value: 9 },
    ];
    expect(downsampleTimeSeries(data, { bucketMs: 100, aggregation: 'min' })[0].value).toBe(1);
    expect(downsampleTimeSeries(data, { bucketMs: 100, aggregation: 'max' })[0].value).toBe(9);
  });

  it('first/last aggregations honor ts order', () => {
    const data = [
      { ts: 20, value: 9 },
      { ts: 0, value: 5 },
      { ts: 10, value: 1 },
    ];
    expect(downsampleTimeSeries(data, { bucketMs: 100, aggregation: 'first' })[0].value).toBe(5);
    expect(downsampleTimeSeries(data, { bucketMs: 100, aggregation: 'last' })[0].value).toBe(9);
  });

  it('count aggregation', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 0, value: 1 },
        { ts: 10, value: 1 },
        { ts: 20, value: 1 },
      ],
      { bucketMs: 100, aggregation: 'count' }
    );
    expect(r[0].value).toBe(3);
  });

  it('multiple buckets in epoch-aligned mode', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 0, value: 1 },
        { ts: 99, value: 3 },
        { ts: 100, value: 5 },
        { ts: 199, value: 7 },
        { ts: 200, value: 9 },
      ],
      { bucketMs: 100, aggregation: 'mean' }
    );
    expect(r).toEqual([
      { ts: 0, value: 2 },
      { ts: 100, value: 6 },
      { ts: 200, value: 9 },
    ]);
  });

  it('alignToEpoch=false anchors on first point', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 30, value: 1 },
        { ts: 60, value: 2 },
        { ts: 130, value: 3 },
      ],
      { bucketMs: 100, alignToEpoch: false }
    );
    expect(r[0].ts).toBe(30);
    expect(r[1].ts).toBe(130);
  });

  it('fills empty buckets when range provided', () => {
    const r = downsampleTimeSeries(
      [{ ts: 0, value: 5 }, { ts: 250, value: 7 }],
      { bucketMs: 100, aggregation: 'mean', rangeStartMs: 0, rangeEndMs: 400, fillValue: -1 }
    );
    expect(r).toEqual([
      { ts: 0, value: 5 },
      { ts: 100, value: -1 },
      { ts: 200, value: 7 },
      { ts: 300, value: -1 },
    ]);
  });

  it('range with no fillValue uses 0', () => {
    const r = downsampleTimeSeries([], {
      bucketMs: 100,
      rangeStartMs: 0,
      rangeEndMs: 200,
    });
    expect(r).toEqual([
      { ts: 0, value: 0 },
      { ts: 100, value: 0 },
    ]);
  });

  it('throws when rangeEnd <= rangeStart', () => {
    expect(() =>
      downsampleTimeSeries([], { bucketMs: 100, rangeStartMs: 100, rangeEndMs: 100 })
    ).toThrow();
  });

  it('skips points with non-finite ts/value', () => {
    const r = downsampleTimeSeries(
      [
        { ts: NaN, value: 1 },
        { ts: 0, value: Infinity },
        { ts: 0, value: 5 },
      ],
      { bucketMs: 100, aggregation: 'mean' }
    );
    expect(r).toEqual([{ ts: 0, value: 5 }]);
  });

  it('handles unsorted input', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 200, value: 3 },
        { ts: 0, value: 1 },
        { ts: 100, value: 2 },
      ],
      { bucketMs: 100 }
    );
    expect(r.map((p) => p.ts)).toEqual([0, 100, 200]);
  });

  it('default aggregation is mean', () => {
    const r = downsampleTimeSeries(
      [
        { ts: 0, value: 2 },
        { ts: 10, value: 4 },
      ],
      { bucketMs: 100 }
    );
    expect(r[0].value).toBe(3);
  });

  it('negative ts supported', () => {
    const r = downsampleTimeSeries(
      [
        { ts: -150, value: 1 },
        { ts: -50, value: 3 },
      ],
      { bucketMs: 100, aggregation: 'mean' }
    );
    expect(r.map((p) => p.ts)).toEqual([-200, -100]);
  });
});
