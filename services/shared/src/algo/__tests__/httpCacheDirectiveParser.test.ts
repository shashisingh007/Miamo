import { describe, it, expect } from 'vitest';
import {
  parseCacheControl,
  isCacheable,
  effectiveFreshnessSec,
} from '../httpCacheDirectiveParser';

describe('httpCacheDirectiveParser', () => {
  it('empty header -> defaults', () => {
    const d = parseCacheControl('');
    expect(d.maxAgeSec).toBeNull();
    expect(d.visibility).toBeNull();
    expect(d.noStore).toBe(false);
  });

  it('null/undefined safe', () => {
    expect(parseCacheControl(null).maxAgeSec).toBeNull();
    expect(parseCacheControl(undefined).maxAgeSec).toBeNull();
  });

  it('parses max-age', () => {
    expect(parseCacheControl('max-age=300').maxAgeSec).toBe(300);
  });

  it('parses s-maxage and quoted values', () => {
    expect(parseCacheControl('s-maxage="120"').sMaxAgeSec).toBe(120);
  });

  it('parses swr + sie', () => {
    const d = parseCacheControl('max-age=60, stale-while-revalidate=30, stale-if-error=600');
    expect(d.staleWhileRevalidateSec).toBe(30);
    expect(d.staleIfErrorSec).toBe(600);
  });

  it('private overrides public', () => {
    expect(parseCacheControl('public, private').visibility).toBe('private');
  });

  it('captures flags', () => {
    const d = parseCacheControl('no-store, no-cache, must-revalidate, immutable');
    expect(d.noStore && d.noCache && d.mustRevalidate && d.immutable).toBe(true);
  });

  it('case-insensitive token parse', () => {
    expect(parseCacheControl('Max-Age=42, PUBLIC').maxAgeSec).toBe(42);
  });

  it('negative max-age rejected (stays null)', () => {
    expect(parseCacheControl('max-age=-5').maxAgeSec).toBeNull();
  });

  it('non-numeric max-age ignored', () => {
    expect(parseCacheControl('max-age=abc').maxAgeSec).toBeNull();
  });

  it('isCacheable false when no-store', () => {
    expect(isCacheable(parseCacheControl('no-store, max-age=60'))).toBe(false);
  });

  it('isCacheable true with max-age', () => {
    expect(isCacheable(parseCacheControl('max-age=60'))).toBe(true);
  });

  it('isCacheable false without freshness', () => {
    expect(isCacheable(parseCacheControl('public'))).toBe(false);
  });

  it('effectiveFreshnessSec shared prefers s-maxage', () => {
    const d = parseCacheControl('max-age=60, s-maxage=120');
    expect(effectiveFreshnessSec(d, 'shared')).toBe(120);
    expect(effectiveFreshnessSec(d, 'private')).toBe(60);
  });

  it('effectiveFreshnessSec=0 when no-store', () => {
    expect(effectiveFreshnessSec(parseCacheControl('no-store'))).toBe(0);
  });
});
