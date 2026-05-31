/**
 * geoBucket \u2014 Phase 20 privacy-preserving geo quantizer (pure).
 *
 * Coarsens lat/lon to a fixed grid (k-anonymity friendly) before it
 * touches storage or analytics. Returns a stable string id plus the
 * bucket centroid for distance approximations.
 *
 * Default precisionDeg=0.1 => ~11km cells at the equator.
 */
export type GeoBucket = {
  id: string;             // e.g. 'g:37.7,-122.4'
  latCenter: number;
  lonCenter: number;
  precisionDeg: number;
};

export type GeoBucketResult =
  | { ok: true; bucket: GeoBucket }
  | { ok: false; reason: 'invalid_lat' | 'invalid_lon' | 'invalid_precision' };

function roundTo(x: number, step: number): number {
  // Round to nearest multiple of `step`, ensure stable sign for -0.
  const r = Math.round(x / step) * step;
  return Object.is(r, -0) ? 0 : r;
}

export function bucketGeo(lat: number, lon: number, precisionDeg = 0.1): GeoBucketResult {
  if (!Number.isFinite(precisionDeg) || precisionDeg <= 0 || precisionDeg > 90) {
    return { ok: false, reason: 'invalid_precision' };
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, reason: 'invalid_lat' };
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { ok: false, reason: 'invalid_lon' };

  const latC = roundTo(lat, precisionDeg);
  let lonC = roundTo(lon, precisionDeg);
  // Wrap longitude into [-180, 180)
  if (lonC >= 180) lonC -= 360;
  if (lonC < -180) lonC += 360;

  // Determine decimals for stable id (avoid floating noise like 37.70000000004)
  const dec = Math.max(0, Math.min(6, Math.ceil(-Math.log10(precisionDeg))));
  const latStr = latC.toFixed(dec);
  const lonStr = lonC.toFixed(dec);
  return {
    ok: true,
    bucket: {
      id: `g:${latStr},${lonStr}`,
      latCenter: Number(latStr),
      lonCenter: Number(lonStr),
      precisionDeg,
    },
  };
}

export function sameGeoBucket(a: GeoBucket, b: GeoBucket): boolean {
  return a.id === b.id;
}
