/**
 * v3.6.2 — Geocoding helper tests.
 *
 * Tests services/shared/src/geocoding.ts in isolation by stubbing global
 * `fetch` and supplying an in-memory Redis stand-in. Covers:
 *   • happy-path forward + reverse geocode
 *   • cache hit vs miss
 *   • negative result caching ("NULL" → null)
 *   • Nominatim 5xx → null (fail-open)
 *   • rate-limit slot enforcement (in-process)
 *
 * No real network is touched.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  geocodeCity,
  reverseGeocode,
  _waitForRateLimitSlot,
  _resetRateLimitForTests,
  type RedisLike,
} from '../services/shared/src/geocoding';

// ── Minimal in-memory Redis ──
function makeRedis(): RedisLike & { _store: Map<string, string>; _expires: Map<string, number> } {
  const store = new Map<string, string>();
  const exp = new Map<string, number>();
  return {
    _store: store,
    _expires: exp,
    async get(key) {
      const e = exp.get(key);
      if (e && Date.now() > e) { store.delete(key); exp.delete(key); return null; }
      return store.get(key) ?? null;
    },
    async set(key, val, _modeOrEx, ttl) {
      store.set(key, val);
      if (typeof ttl === 'number') exp.set(key, Date.now() + ttl * 1000);
      return 'OK';
    },
    async incr(key) {
      const cur = parseInt(store.get(key) || '0', 10);
      const next = cur + 1;
      store.set(key, String(next));
      return next;
    },
    async expire(key, secs) { exp.set(key, Date.now() + secs * 1000); return 1; },
  };
}

// Helper to stub fetch responses.
function stubFetch(handler: (url: string) => { status: number; body: any } | null) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    const r = handler(url);
    if (!r) {
      return new Response(null, { status: 500 });
    }
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  });
}

describe('geocodeCity', () => {
  beforeEach(() => { _resetRateLimitForTests(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns lat/lng/displayName from Nominatim happy path (no Redis)', async () => {
    stubFetch((url) => {
      expect(url).toContain('/search');
      expect(url).toContain('q=Mumbai');
      return { status: 200, body: [{ lat: '19.076', lon: '72.8777', display_name: 'Mumbai, Maharashtra, India' }] };
    });
    const out = await geocodeCity('Mumbai');
    expect(out).not.toBeNull();
    expect(out!.lat).toBeCloseTo(19.076, 3);
    expect(out!.lng).toBeCloseTo(72.8777, 3);
    expect(out!.displayName).toContain('Mumbai');
  });

  it('caches successful lookups in Redis (second call no fetch)', async () => {
    const redis = makeRedis();
    const f = stubFetch(() => ({ status: 200, body: [{ lat: '12.9716', lon: '77.5946', display_name: 'Bangalore, India' }] }));
    const a = await geocodeCity('Bangalore', redis);
    const b = await geocodeCity('Bangalore', redis);
    expect(a).toEqual(b);
    expect(f).toHaveBeenCalledTimes(1); // second call hit the cache
    const stored = redis._store.get('geocode:v1:bangalore');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.lat).toBeCloseTo(12.9716, 3);
  });

  it('caches negative results as "NULL" and respects them on retry', async () => {
    const redis = makeRedis();
    const f = stubFetch(() => ({ status: 200, body: [] }));
    const a = await geocodeCity('Xyzabc123notacity', redis);
    expect(a).toBeNull();
    expect(redis._store.get('geocode:v1:xyzabc123notacity')).toBe('NULL');
    // Second call should not hit fetch.
    const b = await geocodeCity('Xyzabc123notacity', redis);
    expect(b).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('returns null on Nominatim 5xx (fail-open)', async () => {
    stubFetch(() => null); // 500
    const out = await geocodeCity('Mumbai');
    expect(out).toBeNull();
  });

  it('returns null on malformed JSON (no throw)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('not json', { status: 200 });
    });
    const out = await geocodeCity('Mumbai');
    expect(out).toBeNull();
  });

  it('rejects empty / too-short / too-long input without calling fetch', async () => {
    const f = stubFetch(() => ({ status: 200, body: [] }));
    expect(await geocodeCity('')).toBeNull();
    expect(await geocodeCity('a')).toBeNull();
    expect(await geocodeCity('x'.repeat(200))).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('sends required User-Agent header per Nominatim policy', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init: any) => {
      // The User-Agent must be present and identify the app.
      const ua = init?.headers?.['User-Agent'];
      expect(ua).toMatch(/Miamo/);
      return new Response(JSON.stringify([]), { status: 200 });
    });
    await geocodeCity('Mumbai');
    expect(f).toHaveBeenCalled();
  });

  it('respects in-process rate-limit (≥ 1100ms between back-to-back calls)', async () => {
    _resetRateLimitForTests();
    const t0 = Date.now();
    await _waitForRateLimitSlot();
    await _waitForRateLimitSlot();
    const elapsed = Date.now() - t0;
    // First call should be instant; second call should wait ~1100ms.
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  }, 5000);
});

describe('reverseGeocode', () => {
  beforeEach(() => { _resetRateLimitForTests(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('happy path returns lat/lng/displayName', async () => {
    stubFetch((url) => {
      expect(url).toContain('/reverse');
      return { status: 200, body: { lat: '19.076', lon: '72.8777', display_name: 'Mumbai, Maharashtra, India' } };
    });
    const out = await reverseGeocode(19.076, 72.8777);
    expect(out).not.toBeNull();
    expect(out!.displayName).toContain('Mumbai');
  });

  it('rejects out-of-range coords without fetching', async () => {
    const f = stubFetch(() => ({ status: 200, body: {} }));
    expect(await reverseGeocode(91, 0)).toBeNull();
    expect(await reverseGeocode(0, 181)).toBeNull();
    expect(await reverseGeocode(NaN, 0)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('caches results keyed on 3-decimal-rounded coords', async () => {
    const redis = makeRedis();
    const f = stubFetch(() => ({ status: 200, body: { lat: '19.076', lon: '72.8777', display_name: 'Mumbai' } }));
    await reverseGeocode(19.0761, 72.87768, redis); // rounds to 19.076,72.878
    await reverseGeocode(19.0759, 72.87775, redis); // rounds to 19.076,72.878 — same key
    expect(f).toHaveBeenCalledTimes(1);
  });
});
