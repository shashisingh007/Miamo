import { describe, it, expect } from 'vitest';
import { geohashEncode, geohashDecode, geohashDecodeCenter } from '../geohashEncoder';

describe('geohashEncoder', () => {
  it('encodes known SF coordinate (37.7749, -122.4194)', () => {
    expect(geohashEncode(37.7749, -122.4194, 9)).toBe('9q8yyk8yt');
  });

  it('encodes equator/prime-meridian (0,0)', () => {
    expect(geohashEncode(0, 0, 5)).toBe('s0000');
  });

  it('encodes London approx', () => {
    const h = geohashEncode(51.5074, -0.1278, 7);
    expect(h.startsWith('gcpv')).toBe(true);
  });

  it('precision affects length', () => {
    expect(geohashEncode(10, 10, 1)).toHaveLength(1);
    expect(geohashEncode(10, 10, 12)).toHaveLength(12);
  });

  it('throws on out-of-range lat', () => {
    expect(() => geohashEncode(91, 0)).toThrow(RangeError);
    expect(() => geohashEncode(-91, 0)).toThrow(RangeError);
  });

  it('throws on out-of-range lon', () => {
    expect(() => geohashEncode(0, 181)).toThrow(RangeError);
    expect(() => geohashEncode(0, -181)).toThrow(RangeError);
  });

  it('throws on invalid precision', () => {
    expect(() => geohashEncode(0, 0, 0)).toThrow(RangeError);
    expect(() => geohashEncode(0, 0, 13)).toThrow(RangeError);
  });

  it('decode contains the original point', () => {
    const h = geohashEncode(37.7749, -122.4194, 9);
    const b = geohashDecode(h);
    expect(37.7749).toBeGreaterThanOrEqual(b.minLat);
    expect(37.7749).toBeLessThanOrEqual(b.maxLat);
    expect(-122.4194).toBeGreaterThanOrEqual(b.minLon);
    expect(-122.4194).toBeLessThanOrEqual(b.maxLon);
  });

  it('decodeCenter approximates point at high precision', () => {
    const h = geohashEncode(37.7749, -122.4194, 11);
    const c = geohashDecodeCenter(h);
    expect(c.lat).toBeCloseTo(37.7749, 3);
    expect(c.lon).toBeCloseTo(-122.4194, 3);
  });

  it('decode throws on empty', () => {
    expect(() => geohashDecode('')).toThrow(RangeError);
  });

  it('decode throws on invalid char', () => {
    expect(() => geohashDecode('9q8a')).toThrow(RangeError);
  });

  it('decode is case-insensitive', () => {
    const lower = geohashDecodeCenter('9q8yy');
    const upper = geohashDecodeCenter('9Q8YY');
    expect(upper.lat).toBeCloseTo(lower.lat, 10);
    expect(upper.lon).toBeCloseTo(lower.lon, 10);
  });

  it('round-trip stability at precision 8', () => {
    const lat = 40.7128, lon = -74.006;
    const h1 = geohashEncode(lat, lon, 8);
    const c = geohashDecodeCenter(h1);
    const h2 = geohashEncode(c.lat, c.lon, 8);
    expect(h2).toBe(h1);
  });

  it('higher precision narrows bounds', () => {
    const b1 = geohashDecode(geohashEncode(45, 45, 3));
    const b2 = geohashDecode(geohashEncode(45, 45, 9));
    expect(b2.maxLat - b2.minLat).toBeLessThan(b1.maxLat - b1.minLat);
    expect(b2.maxLon - b2.minLon).toBeLessThan(b1.maxLon - b1.minLon);
  });

  it('encodes (90,180) extremes', () => {
    const h = geohashEncode(90, 180, 5);
    expect(h).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{5}$/);
  });

  it('encodes (-90,-180) extremes', () => {
    const h = geohashEncode(-90, -180, 5);
    expect(h).toBe('00000');
  });

  it('neighboring points share prefix', () => {
    const a = geohashEncode(37.7749, -122.4194, 7);
    const b = geohashEncode(37.7750, -122.4194, 7);
    expect(a.slice(0, 5)).toBe(b.slice(0, 5));
  });

  it('default precision is 9', () => {
    expect(geohashEncode(10, 10).length).toBe(9);
  });
});
