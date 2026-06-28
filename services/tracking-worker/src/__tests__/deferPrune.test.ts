import { describe, it, expect } from 'vitest';
import { _internals } from '../deferPrune';

const { computePruneCutoff } = _internals;

describe('computePruneCutoff', () => {
  it('subtracts the configured number of days', () => {
    const now = new Date(Date.UTC(2026, 4, 31, 12, 0, 0));
    const cutoff = computePruneCutoff(now, 30);
    expect(cutoff.toISOString()).toBe('2026-05-01T12:00:00.000Z');
  });

  it('clamps non-positive maxAgeDays to 1 day', () => {
    const now = new Date(Date.UTC(2026, 4, 31, 0, 0, 0));
    expect(computePruneCutoff(now, 0).toISOString()).toBe('2026-05-30T00:00:00.000Z');
    expect(computePruneCutoff(now, -5).toISOString()).toBe('2026-05-30T00:00:00.000Z');
  });

  it('floors fractional day inputs', () => {
    const now = new Date(Date.UTC(2026, 4, 31, 0, 0, 0));
    expect(computePruneCutoff(now, 7.9).toISOString()).toBe('2026-05-24T00:00:00.000Z');
  });

  it('returns a new Date instance (does not mutate input)', () => {
    const now = new Date(Date.UTC(2026, 4, 31, 0, 0, 0));
    const before = now.toISOString();
    computePruneCutoff(now, 10);
    expect(now.toISOString()).toBe(before);
  });
});
