/**
 * Forward + reverse geocoding via Nominatim (OpenStreetMap).
 *
 * Nominatim usage policy: max 1 request/second, descriptive User-Agent
 * required. https://operations.osmfoundation.org/policies/nominatim/
 *
 * Design choices:
 *  - Uses native `fetch` (no axios dep).
 *  - Rate-limit: in-process token-bucket of 1 req / 1100ms. When a Redis
 *    client is supplied, we additionally claim a distributed lock via
 *    INCR with a 1s TTL so a multi-replica deployment still respects the
 *    1 rps cap.
 *  - Caches lookups in Redis for 30 days (key: `geocode:v1:<lower>`).
 *    When Redis is unavailable we silently fall through to the network.
 *  - On any network/parse error returns null (fail-open: Discover treats
 *    a missing geo result as "no distance filter").
 *  - 5 s timeout via AbortController.
 *
 * Spec ref: docs/architecture/launch-audit.md §2.1 — distance filter must be
 * a real geo operation, not a UI-only field.
 */

/** Minimal duck-typed Redis surface — keeps shared layer dep-free. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, val: string, ...args: any[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export interface Geocoded {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_BASE = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'Miamo-DatingApp/1.0 (contact@miamo.in)';
const CACHE_PREFIX = 'geocode:v1:';
const CACHE_TTL_SECS = 30 * 24 * 60 * 60; // 30 days
const RATE_LIMIT_MS = 1100; // 1 req/sec with 100ms buffer
const REQUEST_TIMEOUT_MS = 5000;

/** In-process last-request timestamp (used when no Redis). */
let _lastRequestAt = 0;

/**
 * Wait (if needed) until at least RATE_LIMIT_MS has elapsed since the last
 * call. When a Redis client is provided, claim a distributed slot by
 * INCR-ing a 1s-TTL counter and back off when the counter exceeds 1.
 *
 * Exported only for test injection.
 */
export async function _waitForRateLimitSlot(redis?: RedisLike): Promise<void> {
  if (redis) {
    // Distributed sliding-window: 1 req/sec across all callers sharing this
    // Redis. Key auto-expires so we don't accumulate state.
    const winKey = `geocode:rl:${Math.floor(Date.now() / 1000)}`;
    try {
      const n = await redis.incr(winKey);
      if (n === 1) await redis.expire(winKey, 2);
      if (n > 1) {
        // Wait for the next 1s window plus a small buffer.
        const waitMs = 1000 - (Date.now() % 1000) + 100;
        await new Promise((r) => setTimeout(r, waitMs));
      }
      return;
    } catch {
      // Redis transient failure → fall through to in-process limiter
    }
  }
  const now = Date.now();
  const since = now - _lastRequestAt;
  if (since < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - since));
  }
  _lastRequestAt = Date.now();
}

/**
 * Reset the in-process rate-limit clock. Tests only — not exported via
 * index, but accessible via direct import.
 */
export function _resetRateLimitForTests(): void { _lastRequestAt = 0; }

// bug-hunt part2 fix #12 (docs/architecture/bug-hunt-2026-07-part2.md #23) —
// track 429s so we can alert when Nominatim starts rate-limiting us. Also
// used to gate the one-shot retry-with-backoff below.
const _geocodingStats = { rateLimitedTotal: 0, retryTotal: 0, timeoutTotal: 0 };
export function _getGeocodingStats(): typeof _geocodingStats { return _geocodingStats; }
export function _resetGeocodingStats(): void {
  _geocodingStats.rateLimitedTotal = 0;
  _geocodingStats.retryTotal = 0;
  _geocodingStats.timeoutTotal = 0;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      signal: ctrl.signal,
    });
  } catch {
    _geocodingStats.timeoutTotal += 1;
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch that respects Nominatim's 429 rate-limit response by waiting for
 * `Retry-After` (capped at 5s) and retrying once. If the second attempt
 * still 429s the caller sees `null` and falls back to no-op behaviour.
 * Increments the internal `_geocodingStats` counters so ops can alarm
 * on sustained rate-limiting.
 */
async function fetchWithRetryOn429(url: string, timeoutMs: number): Promise<Response | null> {
  const first = await fetchWithTimeout(url, timeoutMs);
  if (!first || first.status !== 429) return first;
  _geocodingStats.rateLimitedTotal += 1;
  const retryAfter = first.headers.get('retry-after');
  let waitMs = 1000;
  if (retryAfter) {
    const n = Number(retryAfter);
    if (Number.isFinite(n) && n > 0) waitMs = Math.min(5000, n * 1000);
  }
  await new Promise((r) => setTimeout(r, waitMs));
  _geocodingStats.retryTotal += 1;
  const second = await fetchWithTimeout(url, timeoutMs);
  if (second && second.status === 429) _geocodingStats.rateLimitedTotal += 1;
  return second;
}

/**
 * Forward-geocode a city name to lat/lng + a canonical display string.
 * Returns null on any failure (404, network error, parse error, timeout).
 *
 * Cache: when `redis` is supplied, hits return immediately; misses store
 * the resolved value for 30 days. Negative results are also cached
 * (cached as the string "NULL") for 1 day so we don't re-hammer the API
 * on a typo.
 */
export async function geocodeCity(
  cityName: string,
  redis?: RedisLike,
): Promise<Geocoded | null> {
  if (!cityName || typeof cityName !== 'string') return null;
  const trimmed = cityName.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  const cacheKey = CACHE_PREFIX + trimmed.toLowerCase();

  // ── Cache hit ──
  if (redis) {
    try {
      const hit = await redis.get(cacheKey);
      if (hit === 'NULL') return null;
      if (hit) {
        const parsed = JSON.parse(hit) as Geocoded;
        if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          return parsed;
        }
      }
    } catch { /* swallow — fall through to network */ }
  }

  await _waitForRateLimitSlot(redis);

  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
  const resp = await fetchWithRetryOn429(url, REQUEST_TIMEOUT_MS);
  if (!resp || !resp.ok) {
    // Cache miss; record short-TTL negative so we don't pile retries.
    if (redis) {
      try { await redis.set(cacheKey, 'NULL', 'EX', 24 * 60 * 60); } catch { /* swallow */ }
    }
    return null;
  }
  let rows: Array<{ lat: string; lon: string; display_name: string }> = [];
  try { rows = (await resp.json()) as typeof rows; } catch { rows = []; }
  if (!Array.isArray(rows) || rows.length === 0) {
    if (redis) {
      try { await redis.set(cacheKey, 'NULL', 'EX', 24 * 60 * 60); } catch { /* swallow */ }
    }
    return null;
  }
  const top = rows[0];
  const lat = parseFloat(top.lat);
  const lng = parseFloat(top.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const out: Geocoded = { lat, lng, displayName: String(top.display_name || trimmed) };

  if (redis) {
    try { await redis.set(cacheKey, JSON.stringify(out), 'EX', CACHE_TTL_SECS); }
    catch { /* swallow */ }
  }
  return out;
}

/**
 * Reverse-geocode a lat/lng pair to a city-shaped result. Uses Nominatim
 * `/reverse`. Same caching + rate-limit posture as `geocodeCity`.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  redis?: RedisLike,
): Promise<Geocoded | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Round to ~100m grid (3 decimals) for caching reuse.
  const cacheKey = `${CACHE_PREFIX}rev:${lat.toFixed(3)},${lng.toFixed(3)}`;

  if (redis) {
    try {
      const hit = await redis.get(cacheKey);
      if (hit === 'NULL') return null;
      if (hit) {
        const parsed = JSON.parse(hit) as Geocoded;
        if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) return parsed;
      }
    } catch { /* swallow */ }
  }

  await _waitForRateLimitSlot(redis);
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
  const resp = await fetchWithRetryOn429(url, REQUEST_TIMEOUT_MS);
  if (!resp || !resp.ok) {
    if (redis) { try { await redis.set(cacheKey, 'NULL', 'EX', 24 * 60 * 60); } catch { /* swallow */ } }
    return null;
  }
  type RevBody = { lat?: string; lon?: string; display_name?: string; address?: Record<string, string> };
  let body: RevBody | null = null;
  try { body = await resp.json() as RevBody; } catch { body = null; }
  if (!body || !body.lat || !body.lon) {
    if (redis) { try { await redis.set(cacheKey, 'NULL', 'EX', 24 * 60 * 60); } catch { /* swallow */ } }
    return null;
  }
  const rlat = parseFloat(body.lat);
  const rlng = parseFloat(body.lon);
  if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) return null;
  const out: Geocoded = {
    lat: rlat,
    lng: rlng,
    displayName: String(body.display_name || `${rlat},${rlng}`),
  };
  if (redis) {
    try { await redis.set(cacheKey, JSON.stringify(out), 'EX', CACHE_TTL_SECS); }
    catch { /* swallow */ }
  }
  return out;
}
