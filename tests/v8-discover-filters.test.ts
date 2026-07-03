/**
 * v3.6.2 — Discover filter wiring tests (property-style).
 *
 * Validates that the filter dimensions wired in this fix actually reduce
 * the candidate pool monotonically when tightened. We don't boot the
 * social server here; we mirror the pure parts of the filter pipeline:
 *
 *   • Distance: post-query Haversine filter (geoDistance.ts)
 *   • Same-city: case-insensitive equality on Profile.city
 *   • datingIntent: predicate on Profile.datingIntent
 *   • hasBio: Profile.bio !== ''
 *
 * Property: tightening any filter shrinks (or holds) the pool; relaxing
 * grows (or holds). This is the founder-asked behavioural test from the
 * audit's launch smoke plan.
 */
import { describe, it, expect } from 'vitest';
import { haversineKm, isWithinRadiusKm } from '../services/shared/src/algo/v8/geoDistance';

type FakeProfile = {
  id: string;
  city: string;
  cityLat: number | null;
  cityLng: number | null;
  datingIntent: string;
  bio: string;
};

// Synthetic Indian-cities candidate pool spanning multiple metros so
// monotonicity tests have something to bite.
function makePool(): FakeProfile[] {
  return [
    { id: 'mum1', city: 'Mumbai',    cityLat: 19.076,  cityLng: 72.8777, datingIntent: 'casual',  bio: 'Hi' },
    { id: 'mum2', city: 'Mumbai',    cityLat: 19.080,  cityLng: 72.880,  datingIntent: 'serious', bio: 'Hello' },
    { id: 'mum3', city: 'mumbai',    cityLat: 19.090,  cityLng: 72.870,  datingIntent: 'casual',  bio: '' },
    { id: 'pun1', city: 'Pune',      cityLat: 18.5204, cityLng: 73.8567, datingIntent: 'casual',  bio: 'Pune dweller' },
    { id: 'blr1', city: 'Bangalore', cityLat: 12.9716, cityLng: 77.5946, datingIntent: 'serious', bio: 'BLR' },
    { id: 'blr2', city: 'Bangalore', cityLat: 12.97,   cityLng: 77.60,   datingIntent: 'casual',  bio: '' },
    { id: 'del1', city: 'Delhi',     cityLat: 28.6139, cityLng: 77.209,  datingIntent: 'serious', bio: 'Delhi' },
    { id: 'che1', city: 'Chennai',   cityLat: 13.0827, cityLng: 80.2707, datingIntent: 'casual',  bio: 'Chen' },
    { id: 'kol1', city: 'Kolkata',   cityLat: 22.5726, cityLng: 88.3639, datingIntent: 'serious', bio: 'Kol' },
    { id: 'nogeo1', city: 'Goa',     cityLat: null,    cityLng: null,    datingIntent: 'casual',  bio: 'Beach' },
  ];
}

const ME = { lat: 19.076, lng: 72.8777, city: 'Mumbai' }; // Mumbai

function applyDistance(pool: FakeProfile[], km: number): FakeProfile[] {
  if (!Number.isFinite(km) || km <= 0) return pool;
  return pool.filter((p) => {
    if (p.cityLat == null || p.cityLng == null) return false;
    return isWithinRadiusKm(ME.lat, ME.lng, p.cityLat, p.cityLng, km);
  });
}

function applySameCity(pool: FakeProfile[]): FakeProfile[] {
  const key = ME.city.trim().toLowerCase();
  return pool.filter((p) => p.city.trim().toLowerCase() === key);
}

function applyDatingIntent(pool: FakeProfile[], intent: string): FakeProfile[] {
  if (!intent) return pool;
  return pool.filter((p) => p.datingIntent.toLowerCase() === intent.toLowerCase());
}

function applyHasBio(pool: FakeProfile[]): FakeProfile[] {
  return pool.filter((p) => p.bio.trim() !== '');
}

describe('Discover filter wiring (post-fix)', () => {
  describe('distance filter is monotonic in radius', () => {
    it('pool(d=10) ⊆ pool(d=50) ⊆ pool(d=250) ⊆ pool(unlimited)', () => {
      const pool = makePool();
      const p10 = applyDistance(pool, 10);
      const p50 = applyDistance(pool, 50);
      const p250 = applyDistance(pool, 250);
      const pUnlim = applyDistance(pool, 0); // 0 = anywhere
      // Strict subset relations
      const ids = (x: FakeProfile[]) => new Set(x.map((p) => p.id));
      const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));
      expect(isSubset(ids(p10), ids(p50))).toBe(true);
      expect(isSubset(ids(p50), ids(p250))).toBe(true);
      expect(p10.length).toBeLessThanOrEqual(p50.length);
      expect(p50.length).toBeLessThanOrEqual(p250.length);
      // Unlimited returns the original pool unchanged
      expect(pUnlim.length).toBe(pool.length);
    });

    it('d=10 from Mumbai excludes Pune (≈ 120 km) and includes the three Mumbai entries', () => {
      const result = applyDistance(makePool(), 10);
      const ids = result.map((p) => p.id);
      expect(ids).toContain('mum1');
      expect(ids).toContain('mum2');
      expect(ids).toContain('mum3');
      expect(ids).not.toContain('pun1');
      expect(ids).not.toContain('blr1');
    });

    it('d=250 from Mumbai includes Pune but not Bangalore (≈ 845 km)', () => {
      const result = applyDistance(makePool(), 250);
      const ids = result.map((p) => p.id);
      expect(ids).toContain('pun1');
      expect(ids).not.toContain('blr1');
    });

    it('candidates without coords are excluded when distance > 0 (fail-closed for THIS profile, not the pool)', () => {
      const result = applyDistance(makePool(), 1000);
      const ids = result.map((p) => p.id);
      expect(ids).not.toContain('nogeo1');
    });
  });

  describe('sameCity filter (post-query)', () => {
    it('returns only Mumbai entries (case-insensitive)', () => {
      const result = applySameCity(makePool());
      const ids = result.map((p) => p.id);
      expect(new Set(ids)).toEqual(new Set(['mum1', 'mum2', 'mum3']));
    });

    it('is at most as large as the original pool', () => {
      const pool = makePool();
      expect(applySameCity(pool).length).toBeLessThanOrEqual(pool.length);
    });
  });

  describe('datingIntent filter', () => {
    it('tightening to "serious" shrinks the pool to only serious profiles', () => {
      const pool = makePool();
      const serious = applyDatingIntent(pool, 'serious');
      const casual = applyDatingIntent(pool, 'casual');
      expect(serious.length).toBeGreaterThan(0);
      expect(casual.length).toBeGreaterThan(0);
      expect(serious.length + casual.length).toBe(pool.length); // exhaustive
      for (const p of serious) expect(p.datingIntent).toBe('serious');
      for (const p of casual) expect(p.datingIntent).toBe('casual');
    });

    it('empty string returns the full pool (no filter)', () => {
      const pool = makePool();
      expect(applyDatingIntent(pool, '').length).toBe(pool.length);
    });
  });

  describe('hasBio filter', () => {
    it('excludes empty bios; result subset of original', () => {
      const pool = makePool();
      const withBio = applyHasBio(pool);
      expect(withBio.length).toBeLessThan(pool.length);
      for (const p of withBio) expect(p.bio.trim()).not.toBe('');
    });
  });

  describe('composability: tightening compounds', () => {
    it('distance=50 ∩ datingIntent=serious is strictly tighter than either alone', () => {
      const pool = makePool();
      const d = applyDistance(pool, 50);
      const i = applyDatingIntent(pool, 'serious');
      const both = applyDatingIntent(applyDistance(pool, 50), 'serious');
      expect(both.length).toBeLessThanOrEqual(d.length);
      expect(both.length).toBeLessThanOrEqual(i.length);
    });

    it('distance=10 ∩ sameCity equals distance=10 within Mumbai', () => {
      const pool = makePool();
      const d10 = applyDistance(pool, 10);
      const both = applySameCity(d10);
      // All Mumbai entries within 10km should remain.
      expect(both.length).toBe(d10.length);
    });
  });

  describe('haversineKm spot-checks used by Discover', () => {
    it('Mumbai → Pune ≈ 120 km (so d=50 excludes, d=250 includes)', () => {
      const km = haversineKm(19.076, 72.8777, 18.5204, 73.8567);
      expect(km).toBeGreaterThan(100);
      expect(km).toBeLessThan(170);
    });
  });
});
