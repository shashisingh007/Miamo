import { describe, it, expect } from 'vitest';
import {
  welfordInit,
  welfordUpdate,
  welfordVariance,
  welfordPopulationVariance,
  welfordOnlineStats,
} from '../welfordOnlineStats';

describe('welfordOnlineStats', () => {
  it('empty => zeros', () => {
    const r = welfordOnlineStats([]);
    expect(r.n).toBe(0);
    expect(r.mean).toBe(0);
    expect(r.variance).toBe(0);
    expect(r.stddev).toBe(0);
  });

  it('single value', () => {
    const r = welfordOnlineStats([7]);
    expect(r.n).toBe(1);
    expect(r.mean).toBe(7);
    expect(r.variance).toBe(0);
  });

  it('mean of 1..10', () => {
    const r = welfordOnlineStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.mean).toBeCloseTo(5.5, 10);
  });

  it('sample variance matches formula', () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const r = welfordOnlineStats(vals);
    expect(r.variance).toBeCloseTo(32 / 7, 10);
  });

  it('population variance matches formula', () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9];
    const r = welfordOnlineStats(vals);
    expect(r.populationVariance).toBeCloseTo(4, 10);
  });

  it('stddev sqrt of variance', () => {
    const r = welfordOnlineStats([1, 2, 3, 4, 5]);
    expect(r.stddev).toBeCloseTo(Math.sqrt(r.variance), 12);
  });

  it('init + manual updates', () => {
    let s = welfordInit();
    for (const v of [10, 20, 30]) s = welfordUpdate(s, v);
    expect(s.mean).toBeCloseTo(20, 10);
    expect(welfordVariance(s)).toBeCloseTo(100, 10);
    expect(welfordPopulationVariance(s)).toBeCloseTo(200 / 3, 10);
  });

  it('throws on NaN', () => {
    expect(() => welfordUpdate(welfordInit(), NaN)).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => welfordUpdate(welfordInit(), Infinity)).toThrow();
  });

  it('handles negatives', () => {
    const r = welfordOnlineStats([-3, -1, 1, 3]);
    expect(r.mean).toBeCloseTo(0, 10);
    expect(r.variance).toBeCloseTo(20 / 3, 10);
  });

  it('accepts generator', () => {
    function* g() { yield 1; yield 2; yield 3; }
    expect(welfordOnlineStats(g()).mean).toBe(2);
  });

  it('matches naive for large sample', () => {
    const arr: number[] = [];
    for (let i = 0; i < 1000; i += 1) arr.push(Math.sin(i));
    const r = welfordOnlineStats(arr);
    const naiveMean = arr.reduce((a, b) => a + b, 0) / arr.length;
    expect(r.mean).toBeCloseTo(naiveMean, 8);
    let sq = 0;
    for (const v of arr) sq += (v - naiveMean) ** 2;
    expect(r.variance).toBeCloseTo(sq / (arr.length - 1), 8);
  });
});
