import { describe, it, expect } from 'vitest';
import { isQuietAt, nextAllowedSend } from '../notifQuietHours';

// 2024-01-15T12:00:00Z. In America/Los_Angeles this is 04:00 local.
const UTC_NOON = Date.UTC(2024, 0, 15, 12, 0, 0);

describe('isQuietAt', () => {
  it('false outside the window (daytime)', () => {
    expect(isQuietAt(
      Date.UTC(2024, 0, 15, 19, 0, 0), // 11:00 LA
      { startLocal: '22:00', endLocal: '07:00', timezone: 'America/Los_Angeles' },
    )).toBe(false);
  });
  it('true inside the window (midnight-spanning)', () => {
    expect(isQuietAt(
      UTC_NOON, // 04:00 LA
      { startLocal: '22:00', endLocal: '07:00', timezone: 'America/Los_Angeles' },
    )).toBe(true);
  });
  it('true inside the window (non-midnight-spanning)', () => {
    expect(isQuietAt(
      Date.UTC(2024, 0, 15, 20, 30, 0), // 12:30 LA
      { startLocal: '12:00', endLocal: '14:00', timezone: 'America/Los_Angeles' },
    )).toBe(true);
  });
  it('false when start == end (window disabled)', () => {
    expect(isQuietAt(
      UTC_NOON,
      { startLocal: '08:00', endLocal: '08:00', timezone: 'America/Los_Angeles' },
    )).toBe(false);
  });
  it('false for malformed times (fail-open)', () => {
    expect(isQuietAt(UTC_NOON, {
      startLocal: 'nope', endLocal: '07:00', timezone: 'UTC',
    })).toBe(false);
  });
  it('end-of-window minute is exclusive', () => {
    // 07:00 LA exactly
    const t = Date.UTC(2024, 0, 15, 15, 0, 0);
    expect(isQuietAt(t, {
      startLocal: '22:00', endLocal: '07:00', timezone: 'America/Los_Angeles',
    })).toBe(false);
  });
});

describe('nextAllowedSend', () => {
  it('returns unchanged outside window', () => {
    const t = Date.UTC(2024, 0, 15, 19, 0, 0); // 11:00 LA
    expect(nextAllowedSend(t, {
      startLocal: '22:00', endLocal: '07:00', timezone: 'America/Los_Angeles',
    })).toBe(t);
  });
  it('advances past the window end when inside', () => {
    const out = nextAllowedSend(UTC_NOON, { // 04:00 LA
      startLocal: '22:00', endLocal: '07:00', timezone: 'America/Los_Angeles',
    });
    expect(out).toBeGreaterThan(UTC_NOON);
    // 04:00 → 07:00 LA is +3h
    expect(out - UTC_NOON).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000 - 60_000);
    expect(out - UTC_NOON).toBeLessThanOrEqual(3 * 60 * 60 * 1000 + 60_000);
  });
});
