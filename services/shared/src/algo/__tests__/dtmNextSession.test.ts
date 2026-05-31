import { describe, it, expect } from 'vitest';
import { decideDtmNextSession } from '../dtmNextSession';

const NOW = 1_700_000_000_000;
const H = 3_600_000;
const D = 24 * H;

describe('decideDtmNextSession', () => {
  it('returns onboarding (now) when coverage < 4', () => {
    const d = decideDtmNextSession({
      coveredCount: 2, driftScore: 0, lastAskedAtMs: null, nowMs: NOW,
    });
    expect(d.reason).toBe('onboarding');
    expect(d.targetAtMs).toBe(NOW);
    expect(d.delayHours).toBe(0);
  });

  it('returns drift (within 6h) when drift > 0.30 and coverage OK', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.5, lastAskedAtMs: NOW - 2 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('drift');
    expect(d.delayHours).toBe(6);
    expect(d.targetAtMs).toBe(NOW + 6 * H);
  });

  it('returns cadence (within 24h) when last ask was > 7d ago', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.1, lastAskedAtMs: NOW - 9 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('cadence');
    expect(d.delayHours).toBe(24);
  });

  it('returns cooldown (~14d from last ask) otherwise', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.1, lastAskedAtMs: NOW - 1 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('cooldown');
    expect(d.targetAtMs).toBe(NOW - 1 * D + 14 * D);
    expect(d.delayHours).toBeCloseTo(13 * 24, 1);
  });

  it('drift wins over cadence', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.9, lastAskedAtMs: NOW - 30 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('drift');
  });

  it('onboarding wins over drift', () => {
    const d = decideDtmNextSession({
      coveredCount: 0, driftScore: 0.9, lastAskedAtMs: null, nowMs: NOW,
    });
    expect(d.reason).toBe('onboarding');
  });

  it('treats lastAskedAtMs=null as infinitely stale (cadence path)', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.05, lastAskedAtMs: null, nowMs: NOW,
    });
    expect(d.reason).toBe('cadence');
  });

  it('boundary: drift exactly 0.30 does NOT trigger drift path', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.30, lastAskedAtMs: NOW - 1 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('cooldown');
  });

  it('boundary: ask exactly 7d ago does NOT trigger cadence path', () => {
    const d = decideDtmNextSession({
      coveredCount: 10, driftScore: 0.05, lastAskedAtMs: NOW - 7 * D, nowMs: NOW,
    });
    expect(d.reason).toBe('cooldown');
  });
});
