import { describe, it, expect } from 'vitest';
import { chronoBucketOf, bucketAlignment } from '../chronoBucket';

// All anchor times below are picked to land in the named LA bucket.
const TZ = 'America/Los_Angeles';

describe('chronoBucketOf', () => {
  it('morning (08:00 LA)', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 15, 16, 0, 0), TZ)).toBe('morning');
  });
  it('afternoon (14:00 LA)', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 15, 22, 0, 0), TZ)).toBe('afternoon');
  });
  it('evening (19:00 LA)', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 16,  3, 0, 0), TZ)).toBe('evening');
  });
  it('night (23:00 LA)', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 16,  7, 0, 0), TZ)).toBe('night');
  });
  it('night (04:00 LA, early hours)', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 15, 12, 0, 0), TZ)).toBe('night');
  });
  it('boundary: 06:00 LA is morning', () => {
    expect(chronoBucketOf(Date.UTC(2024, 0, 15, 14, 0, 0), TZ)).toBe('morning');
  });
});

describe('bucketAlignment', () => {
  it('returns 1.0 for same bucket', () => {
    expect(bucketAlignment('morning', 'morning')).toBe(1.0);
  });
  it('returns 0.6 for adjacent buckets', () => {
    expect(bucketAlignment('morning', 'afternoon')).toBe(0.6);
    expect(bucketAlignment('evening', 'night')).toBe(0.6);
  });
  it('returns 0.6 for adjacent across wrap-around', () => {
    expect(bucketAlignment('night', 'morning')).toBe(0.6);
  });
  it('returns 0.2 for opposite buckets', () => {
    expect(bucketAlignment('morning', 'evening')).toBe(0.2);
    expect(bucketAlignment('afternoon', 'night')).toBe(0.2);
  });
  it('is symmetric', () => {
    expect(bucketAlignment('morning', 'evening')).toBe(bucketAlignment('evening', 'morning'));
  });
});
