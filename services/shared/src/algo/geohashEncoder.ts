const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const DECODE_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < BASE32.length; i++) m[BASE32[i]] = i;
  return m;
})();

export interface GeohashBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function geohashEncode(lat: number, lon: number, precision = 9): string {
  if (precision < 1 || precision > 12) throw new RangeError('precision must be 1..12');
  if (lat < -90 || lat > 90) throw new RangeError('lat out of range');
  if (lon < -180 || lon > 180) throw new RangeError('lon out of range');
  let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
  let evenBit = true;
  let bits = 0;
  let bitCount = 0;
  let out = '';
  while (out.length < precision) {
    if (evenBit) {
      const mid = (minLon + maxLon) / 2;
      if (lon >= mid) { bits = (bits << 1) | 1; minLon = mid; }
      else { bits = bits << 1; maxLon = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { bits = (bits << 1) | 1; minLat = mid; }
      else { bits = bits << 1; maxLat = mid; }
    }
    evenBit = !evenBit;
    bitCount += 1;
    if (bitCount === 5) {
      out += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }
  return out;
}

export function geohashDecode(hash: string): GeohashBounds {
  if (hash.length === 0) throw new RangeError('hash must be non-empty');
  let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
  let evenBit = true;
  for (const ch of hash.toLowerCase()) {
    const v = DECODE_MAP[ch];
    if (v === undefined) throw new RangeError(`invalid geohash char: ${ch}`);
    for (let b = 4; b >= 0; b--) {
      const bit = (v >> b) & 1;
      if (evenBit) {
        const mid = (minLon + maxLon) / 2;
        if (bit === 1) minLon = mid;
        else maxLon = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bit === 1) minLat = mid;
        else maxLat = mid;
      }
      evenBit = !evenBit;
    }
  }
  return { minLat, maxLat, minLon, maxLon };
}

export function geohashDecodeCenter(hash: string): { lat: number; lon: number } {
  const b = geohashDecode(hash);
  return { lat: (b.minLat + b.maxLat) / 2, lon: (b.minLon + b.maxLon) / 2 };
}
