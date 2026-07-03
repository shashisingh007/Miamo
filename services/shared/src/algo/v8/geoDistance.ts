/**
 * v8 Geo Distance — pure Haversine.
 *
 * Computes great-circle distance between two (lat, lng) pairs in kilometres.
 * Used by Discover to filter candidate profiles within a user's chosen
 * radius. Pure function: deterministic, no I/O, no module-level state.
 *
 * Earth radius used: 6371 km (mean radius, standard for Haversine).
 *
 * Spec ref: docs/architecture/launch-audit.md §2 "Filter contract drift".
 *
 * Note: a near-identical `distanceKm` already exists in
 * `services/shared/src/cities.ts`. Keeping a dedicated v8 module here so the
 * algo layer doesn't import from the runtime-data helper and so tests can
 * pin the exact Haversine semantics independent of the city index.
 */

/** Mean Earth radius in kilometres (Haversine standard). */
export const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number { return (deg * Math.PI) / 180; }

/**
 * Haversine great-circle distance (km) between two lat/lng pairs.
 * Inputs in degrees; output non-negative; longitude wrap is handled
 * naturally by trigonometric identities so -180/180 crossover is exact.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Reject non-finite inputs (NaN, Infinity) — return Infinity so the
  // candidate is treated as "out of range" by isWithinRadiusKm.
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return Infinity;
  }
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  // Math.min guards against floating-point a > 1.0 at antipodes.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Returns true iff the great-circle distance between the two points is
 * at most `radiusKm`. Negative or zero radius → always false (consistent
 * with "no filter" being expressed as a null/undefined radius upstream).
 */
export function isWithinRadiusKm(
  lat1: number, lng1: number, lat2: number, lng2: number, radiusKm: number,
): boolean {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return false;
  return haversineKm(lat1, lng1, lat2, lng2) <= radiusKm;
}
