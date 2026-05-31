import { describe, it, expect } from 'vitest';
import { bucketGeo, sameGeoBucket } from '../geoBucket';

describe('geoBucket', () => {
  it('snaps to 0.1deg grid by default', () => {
    const r = bucketGeo(37.7749, -122.4194);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bucket.latCenter).toBe(37.8);
      expect(r.bucket.lonCenter).toBe(-122.4);
      expect(r.bucket.id).toBe('g:37.8,-122.4');
    }
  });

  it('two nearby points fall in same bucket', () => {
    const a = bucketGeo(37.77, -122.41);
    const b = bucketGeo(37.78, -122.42);
    expect(a.ok && b.ok && sameGeoBucket(a.bucket, b.bucket)).toBe(true);
  });

  it('different cities -> different buckets', () => {
    const a = bucketGeo(37.7, -122.4);
    const b = bucketGeo(40.7, -74.0);
    expect(a.ok && b.ok && sameGeoBucket(a.bucket, b.bucket)).toBe(false);
  });

  it('rejects invalid lat', () => {
    expect((bucketGeo(91, 0) as any).reason).toBe('invalid_lat');
    expect((bucketGeo(-91, 0) as any).reason).toBe('invalid_lat');
    expect((bucketGeo(NaN, 0) as any).reason).toBe('invalid_lat');
  });

  it('rejects invalid lon', () => {
    expect((bucketGeo(0, 181) as any).reason).toBe('invalid_lon');
    expect((bucketGeo(0, -181) as any).reason).toBe('invalid_lon');
  });

  it('rejects invalid precision', () => {
    expect((bucketGeo(0, 0, 0) as any).reason).toBe('invalid_precision');
    expect((bucketGeo(0, 0, -1) as any).reason).toBe('invalid_precision');
    expect((bucketGeo(0, 0, 200) as any).reason).toBe('invalid_precision');
  });

  it('precision=1 yields integer-degree centers', () => {
    const r = bucketGeo(37.7, -122.4, 1);
    if (r.ok) {
      expect(r.bucket.latCenter).toBe(38);
      expect(r.bucket.lonCenter).toBe(-122);
    }
  });

  it('avoids -0 in centroid id', () => {
    const r = bucketGeo(-0.01, 0.02, 0.1);
    if (r.ok) {
      expect(Object.is(r.bucket.latCenter, -0)).toBe(false);
      expect(r.bucket.latCenter).toBe(0);
    }
  });

  it('id is stable string', () => {
    const a = bucketGeo(37.77, -122.41);
    const b = bucketGeo(37.77001, -122.40999);
    expect(a.ok && b.ok && a.bucket.id === b.bucket.id).toBe(true);
  });

  it('wraps longitude near \u00b1180', () => {
    const r = bucketGeo(0, 179.99);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bucket.lonCenter).toBeGreaterThanOrEqual(-180);
      expect(r.bucket.lonCenter).toBeLessThan(180);
    }
  });
});
