import { describe, it, expect } from 'vitest';
import {
  createHistogram,
  observeHistogram,
  histogramQuantile,
  histogramAverage,
  DEFAULT_LATENCY_BOUNDS_MS,
} from '../metricsHistogram';

describe('metricsHistogram', () => {
  it('createHistogram allocates counts = bounds.length+1', () => {
    const h = createHistogram([1, 2, 3]);
    expect(h.counts).toHaveLength(4);
    expect(h.count).toBe(0);
  });

  it('uses default latency bounds when none provided', () => {
    const h = createHistogram();
    expect(h.bounds).toBe(DEFAULT_LATENCY_BOUNDS_MS);
  });

  it('rejects non-ascending bounds', () => {
    expect(() => createHistogram([1, 1, 2])).toThrow();
    expect(() => createHistogram([5, 2])).toThrow();
  });

  it('observe places values in correct bucket', () => {
    const h = createHistogram([10, 20]);
    observeHistogram(h, 5);   // bucket 0
    observeHistogram(h, 10);  // bucket 0 (<=)
    observeHistogram(h, 15);  // bucket 1
    observeHistogram(h, 100); // overflow bucket
    expect(h.counts).toEqual([2, 1, 1]);
    expect(h.count).toBe(4);
  });

  it('ignores NaN / negative / Infinity', () => {
    const h = createHistogram([10]);
    observeHistogram(h, NaN);
    observeHistogram(h, -5);
    observeHistogram(h, Infinity);
    expect(h.count).toBe(0);
  });

  it('quantile 0 = first bucket bound; quantile 1 = last bound', () => {
    const h = createHistogram([10, 20, 30]);
    [5, 5, 5, 5, 5].forEach((v) => observeHistogram(h, v));
    expect(histogramQuantile(h, 0)).toBe(10);
    expect(histogramQuantile(h, 1)).toBe(10);
  });

  it('quantile reflects distribution', () => {
    const h = createHistogram([10, 20, 30]);
    for (let i = 0; i < 50; i++) observeHistogram(h, 5);
    for (let i = 0; i < 50; i++) observeHistogram(h, 25);
    expect(histogramQuantile(h, 0.5)).toBe(10);
    expect(histogramQuantile(h, 0.9)).toBe(30);
  });

  it('histogramAverage returns sum/count', () => {
    const h = createHistogram([100]);
    observeHistogram(h, 2);
    observeHistogram(h, 4);
    observeHistogram(h, 6);
    expect(histogramAverage(h)).toBe(4);
  });

  it('empty histogram quantile/average return 0', () => {
    const h = createHistogram([10]);
    expect(histogramQuantile(h, 0.99)).toBe(0);
    expect(histogramAverage(h)).toBe(0);
  });

  it('clamps quantile q outside [0,1]', () => {
    const h = createHistogram([10]);
    observeHistogram(h, 5);
    expect(histogramQuantile(h, -1)).toBe(10);
    expect(histogramQuantile(h, 2)).toBe(10);
  });

  it('large overflow gets last bound at p99', () => {
    const h = createHistogram([10, 20]);
    for (let i = 0; i < 100; i++) observeHistogram(h, 9999);
    expect(histogramQuantile(h, 0.99)).toBe(20);
  });
});
