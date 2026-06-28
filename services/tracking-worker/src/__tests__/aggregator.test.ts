import { describe, it, expect } from 'vitest';
import { hourBucket, dayBucket, PercentileEstimator, DistinctCounter } from '../buckets';
import { _internals } from '../feature';

describe('hourBucket / dayBucket', () => {
  it('truncates to UTC hour', () => {
    const h = hourBucket(Date.UTC(2026, 4, 26, 14, 37, 22));
    expect(h.getUTCHours()).toBe(14);
    expect(h.getUTCMinutes()).toBe(0);
    expect(h.getUTCSeconds()).toBe(0);
  });
  it('truncates to UTC day', () => {
    const d = dayBucket(Date.UTC(2026, 4, 26, 14, 37, 22));
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
  });
});

describe('PercentileEstimator', () => {
  it('roughly approximates p50 / p95 on uniform inputs', () => {
    const pe = new PercentileEstimator(256);
    for (let i = 1; i <= 100; i++) pe.add(i);
    expect(pe.percentile(50)).toBeGreaterThanOrEqual(40);
    expect(pe.percentile(50)).toBeLessThanOrEqual(60);
    expect(pe.percentile(95)).toBeGreaterThanOrEqual(85);
    expect(pe.percentile(95)).toBeLessThanOrEqual(100);
  });
  it('returns 0 on empty', () => {
    expect(new PercentileEstimator().percentile(50)).toBe(0);
  });
});

describe('DistinctCounter', () => {
  it('counts unique strings', () => {
    const dc = new DistinctCounter(10);
    dc.add('a'); dc.add('a'); dc.add('b'); dc.add('c');
    expect(dc.count).toBe(3);
  });
  it('caps at capacity', () => {
    const dc = new DistinctCounter(3);
    ['a','b','c','d','e'].forEach((x) => dc.add(x));
    expect(dc.isCapped).toBe(true);
    expect(dc.count).toBe(3);
  });
});

describe('feature inference', () => {
  const mkH = (hour: number, count: number) => ({
    uidHash: 'u', evt: 'page.view',
    bucket: new Date(Date.UTC(2026, 4, 26, hour, 0, 0)),
    count, durSum: 0,
  });
  it('chronotype = morning when most activity is 5–12 UTC', () => {
    const rows = [mkH(6, 10), mkH(7, 10), mkH(8, 8), mkH(20, 1)];
    expect(_internals.chronotypeOf(rows)).toBe('morning');
  });
  it('chronotype = mixed when no peak dominates', () => {
    const rows = [mkH(6, 5), mkH(14, 5), mkH(20, 5), mkH(2, 5)];
    expect(_internals.chronotypeOf(rows)).toBe('mixed');
  });

  const mkD = (evt: string, count: number) => ({
    uidHash: 'u', evt, day: new Date(), count, durSum: 0,
  });
  it('attentionProfile = scanner when scrolls dominate', () => {
    const rows = [mkD('scroll.depth', 50), mkD('dwell', 1), mkD('album.view', 1)];
    expect(_internals.attentionProfileOf(rows)).toBe('scanner');
  });
  it('rage rate computed when enough clicks', () => {
    const rows = [mkD('click', 100), mkD('click.rage', 7)];
    expect(_internals.rageRate(rows)).toBe(0.07);
  });
  it('rage rate null when too few clicks', () => {
    const rows = [mkD('click', 5), mkD('click.rage', 2)];
    expect(_internals.rageRate(rows)).toBeNull();
  });
});
