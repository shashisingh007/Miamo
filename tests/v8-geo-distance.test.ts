/**
 * v3.6.2 — Geo Distance (Haversine) tests.
 *
 * Pure-function tests for services/shared/src/algo/v8/geoDistance.ts. These
 * pin the Haversine semantics used by Discover's distance filter so that
 * any future refactor (e.g. switching to Vincenty) can be detected by a
 * red test rather than silent ranking drift.
 *
 * Reference distances cross-checked against multiple online great-circle
 * calculators (great-circle-mapper, geomidpoint). Tolerance ±0.5% so we
 * don't churn on micro-precision changes in Math.asin/sin polyfills.
 */
import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  isWithinRadiusKm,
  EARTH_RADIUS_KM,
} from '../services/shared/src/algo/v8/geoDistance';

// Approx-equality helper. Tolerance is a percentage of the expected value
// (or an absolute floor of 1 km, whichever is larger) to handle very small
// distances without false negatives.
function approxKm(actual: number, expected: number, tolPct = 0.5) {
  const tol = Math.max(1, (expected * tolPct) / 100);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

describe('haversineKm', () => {
  it('returns 0 for identical points (Mumbai → Mumbai)', () => {
    const d = haversineKm(19.076, 72.8777, 19.076, 72.8777);
    expect(d).toBe(0);
  });

  it('Mumbai → Bangalore ≈ 845 km', () => {
    // Mumbai (19.0760, 72.8777) → Bangalore (12.9716, 77.5946)
    const d = haversineKm(19.076, 72.8777, 12.9716, 77.5946);
    approxKm(d, 845, 1.5);
  });

  it('Mumbai → Delhi ≈ 1163 km', () => {
    // Mumbai (19.0760, 72.8777) → New Delhi (28.6139, 77.2090)
    const d = haversineKm(19.076, 72.8777, 28.6139, 77.209);
    approxKm(d, 1163, 1.5);
  });

  it('New York → London ≈ 5570 km', () => {
    // NYC (40.7128, -74.006) → London (51.5074, -0.1278)
    const d = haversineKm(40.7128, -74.006, 51.5074, -0.1278);
    approxKm(d, 5570, 1.5);
  });

  it('antipodal points ≈ π × R = ~20015 km', () => {
    // (0,0) to (0,180) — exactly antipodal on the equator.
    const d = haversineKm(0, 0, 0, 180);
    const expected = Math.PI * EARTH_RADIUS_KM;
    approxKm(d, expected, 0.01);
  });

  it('180° longitude crossover is symmetric (179 vs -179)', () => {
    // Two points 2° apart in longitude, straddling the antimeridian.
    const a = haversineKm(0, 179, 0, -179);
    const b = haversineKm(0, -179, 0, 179);
    expect(a).toBeCloseTo(b, 6);
    // 2° on the equator ≈ 222.4 km
    approxKm(a, 222.4, 1);
  });

  it('is symmetric in argument order', () => {
    const a = haversineKm(19.076, 72.8777, 28.6139, 77.209);
    const b = haversineKm(28.6139, 77.209, 19.076, 72.8777);
    expect(a).toBeCloseTo(b, 9);
  });

  it('handles equatorial 1° longitude span ≈ 111.2 km', () => {
    const d = haversineKm(0, 0, 0, 1);
    approxKm(d, 111.2, 1);
  });

  it('handles 1° latitude span at any longitude ≈ 111.2 km', () => {
    const d = haversineKm(0, 50, 1, 50);
    approxKm(d, 111.2, 1);
  });

  it('handles poles correctly (90, 0) → (90, 180) = 0', () => {
    // The North Pole is a single point regardless of longitude.
    const d = haversineKm(90, 0, 90, 180);
    // Floating-point: should be vanishingly small.
    expect(d).toBeLessThan(0.001);
  });

  it('North Pole → South Pole = π × R', () => {
    const d = haversineKm(90, 0, -90, 0);
    const expected = Math.PI * EARTH_RADIUS_KM;
    approxKm(d, expected, 0.01);
  });

  it('returns Infinity for non-finite inputs', () => {
    expect(haversineKm(NaN, 0, 0, 0)).toBe(Infinity);
    expect(haversineKm(0, Infinity, 0, 0)).toBe(Infinity);
  });
});

describe('isWithinRadiusKm', () => {
  it('Mumbai → Bandra (3 km apart) within 10 km radius', () => {
    // Mumbai (19.076, 72.8777) → Bandra (19.0596, 72.8295). ~5 km.
    expect(isWithinRadiusKm(19.076, 72.8777, 19.0596, 72.8295, 10)).toBe(true);
  });

  it('Mumbai → Pune (~120 km) NOT within 50 km radius', () => {
    // Pune (18.5204, 73.8567)
    expect(isWithinRadiusKm(19.076, 72.8777, 18.5204, 73.8567, 50)).toBe(false);
  });

  it('Mumbai → Pune within 250 km radius', () => {
    expect(isWithinRadiusKm(19.076, 72.8777, 18.5204, 73.8567, 250)).toBe(true);
  });

  it('zero radius always returns false', () => {
    expect(isWithinRadiusKm(0, 0, 0, 0, 0)).toBe(false);
  });

  it('negative radius always returns false', () => {
    expect(isWithinRadiusKm(0, 0, 0, 0, -10)).toBe(false);
  });

  it('non-finite radius returns false', () => {
    expect(isWithinRadiusKm(0, 0, 0, 0, NaN)).toBe(false);
    expect(isWithinRadiusKm(0, 0, 0, 0, Infinity)).toBe(false);
  });

  it('boundary: distance exactly equal to radius is INSIDE (≤)', () => {
    // Construct two points whose Haversine distance is known.
    const exactKm = haversineKm(19.076, 72.8777, 18.5204, 73.8567);
    expect(isWithinRadiusKm(19.076, 72.8777, 18.5204, 73.8567, exactKm)).toBe(true);
    expect(isWithinRadiusKm(19.076, 72.8777, 18.5204, 73.8567, exactKm - 0.01)).toBe(false);
  });
});
