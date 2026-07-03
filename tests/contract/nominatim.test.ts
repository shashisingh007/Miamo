/**
 * Contract test — Nominatim (OpenStreetMap geocoding API).
 *
 * What this test covers:
 *   Our `geocodeCity` / `reverseGeocode` helpers speak a specific dialect
 *   of the Nominatim `/search` and `/reverse` JSON responses. If the API
 *   quietly changes shape (a field renamed, a coordinate returned as
 *   number instead of string), our production geocoding silently breaks
 *   and users see "unknown city" in Discover.
 *
 * This test locks in the parser contract by mocking `fetch`. It PASSES
 * today because our parser matches the current API; it FAILS the moment
 * the parser drifts.
 *
 * Cross-refs:
 *   - services/shared/src/geocoding.ts
 *   - docs/architecture/launch-audit.md §2.1
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  geocodeCity,
  reverseGeocode,
  _resetRateLimitForTests,
  _resetGeocodingStats,
  _getGeocodingStats,
} from '../../services/shared/src/geocoding';

// Small helper to fake a successful `fetch` response with a canned body.
function mockFetchOk(body: unknown, headers: Record<string, string> = {}): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: (h: string) => headers[h.toLowerCase()] ?? null },
    json: async () => body,
  })));
}

function mockFetch429(retryAfter?: string): void {
  const headers: Record<string, string> = retryAfter ? { 'retry-after': retryAfter } : {};
  // Two responses in sequence: first 429, then a valid single-row body.
  let call = 0;
  vi.stubGlobal('fetch', vi.fn(async () => {
    call += 1;
    if (call === 1) {
      return {
        ok: false,
        status: 429,
        headers: { get: (h: string) => headers[h.toLowerCase()] ?? null },
        json: async () => [],
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [{ lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, India' }],
    };
  }));
}

describe('Nominatim contract — /search response shape', () => {
  beforeEach(() => {
    _resetRateLimitForTests();
    _resetGeocodingStats();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('parses lat/lon as strings and coerces to finite numbers', async () => {
    mockFetchOk([{ lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, Maharashtra, India' }]);
    const out = await geocodeCity('Mumbai');
    expect(out).not.toBeNull();
    expect(out!.lat).toBeCloseTo(19.076, 3);
    expect(out!.lng).toBeCloseTo(72.8777, 4);
    expect(out!.displayName).toBe('Mumbai, Maharashtra, India');
  });

  it('returns null on empty result array (city not found)', async () => {
    mockFetchOk([]);
    const out = await geocodeCity('Xyzunknowntown');
    expect(out).toBeNull();
  });

  it('returns null when response is not an array', async () => {
    // Nominatim occasionally responds with `{}` for malformed queries.
    mockFetchOk({});
    const out = await geocodeCity('BadQuery');
    expect(out).toBeNull();
  });

  it('returns null when lat/lon are non-numeric strings', async () => {
    mockFetchOk([{ lat: 'not-a-number', lon: 'also-nan', display_name: 'X' }]);
    const out = await geocodeCity('Weird');
    expect(out).toBeNull();
  });

  it('takes the first row when multiple candidates come back', async () => {
    mockFetchOk([
      { lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, India' },
      { lat: '25.0', lon: '55.0', display_name: 'Not Mumbai' },
    ]);
    const out = await geocodeCity('Mumbai');
    expect(out?.displayName).toBe('Mumbai, India');
  });

  it('honours Retry-After and retries once on 429, incrementing stats', async () => {
    _resetGeocodingStats();
    mockFetch429('0');   // 0-second Retry-After (well under the 5-s cap)
    const out = await geocodeCity('Mumbai');
    expect(out).not.toBeNull();
    const stats = _getGeocodingStats();
    expect(stats.rateLimitedTotal).toBeGreaterThanOrEqual(1);
    expect(stats.retryTotal).toBeGreaterThanOrEqual(1);
  });

  it('rejects inputs that are too short (<2 chars)', async () => {
    // No fetch should be issued at all.
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const out = await geocodeCity('a');
    expect(out).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects inputs that are too long (>120 chars)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const out = await geocodeCity('x'.repeat(121));
    expect(out).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reverseGeocode parses /reverse body shape (lat/lon/display_name)', async () => {
    mockFetchOk({ lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, India' });
    const out = await reverseGeocode(19.076, 72.8777);
    expect(out).not.toBeNull();
    expect(out!.lat).toBeCloseTo(19.076, 3);
    expect(out!.displayName).toBe('Mumbai, India');
  });

  it('reverseGeocode returns null on malformed body (missing lat/lon)', async () => {
    mockFetchOk({ display_name: 'Nowhere' });
    const out = await reverseGeocode(19.076, 72.8777);
    expect(out).toBeNull();
  });

  it('reverseGeocode rejects out-of-range coordinates (|lat|>90 or |lng|>180)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await reverseGeocode(91, 0)).toBeNull();
    expect(await reverseGeocode(0, 181)).toBeNull();
    expect(await reverseGeocode(NaN, 0)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
