import { describe, it, expect } from 'vitest';
import { classifyCacheEntry } from '../cacheStaleWhileRevalidate';

describe('cacheStaleWhileRevalidate', () => {
  it('fresh when age <= maxAge', () => {
    const r = classifyCacheEntry({ ageSeconds: 5, maxAgeSeconds: 10 });
    expect(r.state).toBe('fresh');
    expect(r.serveCached).toBe(true);
    expect(r.shouldRevalidate).toBe(false);
  });

  it('fresh at exact boundary', () => {
    const r = classifyCacheEntry({ ageSeconds: 10, maxAgeSeconds: 10 });
    expect(r.state).toBe('fresh');
  });

  it('stale within SWR window', () => {
    const r = classifyCacheEntry({ ageSeconds: 15, maxAgeSeconds: 10, staleWhileRevalidateSeconds: 30 });
    expect(r.state).toBe('stale');
    expect(r.serveCached).toBe(true);
    expect(r.shouldRevalidate).toBe(true);
  });

  it('error-ok within SIE after SWR exhausted', () => {
    const r = classifyCacheEntry({
      ageSeconds: 50,
      maxAgeSeconds: 10,
      staleWhileRevalidateSeconds: 20, // up to 30
      staleIfErrorSeconds: 60,         // up to 90
    });
    expect(r.state).toBe('error-ok');
    expect(r.serveCached).toBe(true);
  });

  it('expired beyond all windows', () => {
    const r = classifyCacheEntry({
      ageSeconds: 1000,
      maxAgeSeconds: 10,
      staleWhileRevalidateSeconds: 20,
      staleIfErrorSeconds: 60,
    });
    expect(r.state).toBe('expired');
    expect(r.serveCached).toBe(false);
    expect(r.shouldRevalidate).toBe(true);
  });

  it('no SWR/SIE -> goes straight to expired after maxAge', () => {
    const r = classifyCacheEntry({ ageSeconds: 11, maxAgeSeconds: 10 });
    expect(r.state).toBe('expired');
  });

  it('clamps negative ages to 0 (fresh)', () => {
    const r = classifyCacheEntry({ ageSeconds: -5, maxAgeSeconds: 10 });
    expect(r.state).toBe('fresh');
    expect(r.ageSeconds).toBe(0);
  });

  it('treats NaN age as 0', () => {
    const r = classifyCacheEntry({ ageSeconds: NaN, maxAgeSeconds: 10 });
    expect(r.state).toBe('fresh');
    expect(r.ageSeconds).toBe(0);
  });

  it('boundary: maxAge + swr exactly -> stale', () => {
    const r = classifyCacheEntry({ ageSeconds: 30, maxAgeSeconds: 10, staleWhileRevalidateSeconds: 20 });
    expect(r.state).toBe('stale');
  });

  it('boundary: just past swr+sie -> expired', () => {
    const r = classifyCacheEntry({
      ageSeconds: 91,
      maxAgeSeconds: 10,
      staleWhileRevalidateSeconds: 20,
      staleIfErrorSeconds: 60,
    });
    expect(r.state).toBe('expired');
  });

  it('maxAge=0 with positive age -> immediate stale (if swr set)', () => {
    const r = classifyCacheEntry({ ageSeconds: 1, maxAgeSeconds: 0, staleWhileRevalidateSeconds: 5 });
    expect(r.state).toBe('stale');
  });
});
