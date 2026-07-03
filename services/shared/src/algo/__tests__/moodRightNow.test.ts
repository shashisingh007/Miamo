import { describe, it, expect } from 'vitest';
import {
  inferMood,
  isLowMood,
  NEUTRAL_MOOD,
  MOOD_TTL_MS,
  type MoodInferenceInput,
  type MoodVector,
} from '../v8/moodRightNow';

const NOW = 1_750_000_000_000;

function nullInput(overrides: Partial<MoodInferenceInput> = {}): MoodInferenceInput {
  return {
    rageClickRate: null,
    dwellVariance: null,
    scrollVelocity: null,
    localHour: null,
    recentRegretCount: 0,
    recentReturnCount: 0,
    nowMs: NOW,
    ...overrides,
  };
}

const isInBounds = (m: MoodVector): boolean =>
  (Object.values(m) as number[]).every(v => v >= 0 && v <= 1);

describe('inferMood — neutral / fallbacks', () => {
  it('all-null input → NEUTRAL_MOOD', () => {
    const m = inferMood(nullInput());
    expect(m).toEqual(NEUTRAL_MOOD);
  });

  it('NEUTRAL_MOOD is all 0.5', () => {
    expect(NEUTRAL_MOOD).toEqual({
      rage: 0.5, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.5,
    });
  });

  it('MOOD_TTL_MS is the documented 90s constant', () => {
    expect(MOOD_TTL_MS).toBe(90_000);
  });
});

describe('inferMood — per-dimension', () => {
  it('high rageClickRate → rage > 0.6', () => {
    const m = inferMood(nullInput({ rageClickRate: 1, recentRegretCount: 3 }));
    expect(m.rage).toBeGreaterThan(0.6);
  });

  it('high rage → receptive low (receptive = 1 - rage)', () => {
    const m = inferMood(nullInput({ rageClickRate: 1, recentRegretCount: 5 }));
    expect(m.receptive).toBeLessThanOrEqual(1 - m.rage + 1e-9);
    expect(m.receptive).toBeLessThan(0.4);
  });

  it('high dwellVariance → calm low', () => {
    const m = inferMood(nullInput({ dwellVariance: 50_000 }));
    expect(m.calm).toBeLessThan(0.1);
  });

  it('zero dwellVariance → calm = 1.0', () => {
    const m = inferMood(nullInput({ dwellVariance: 0 }));
    expect(m.calm).toBeCloseTo(1.0, 5);
  });

  it('late-night localHour=23 → fatigued elevated', () => {
    const m = inferMood(nullInput({ localHour: 23, recentRegretCount: 1 }));
    expect(m.fatigued).toBeGreaterThan(0.3);
  });

  it('owl-hour localHour=3 → fatigued elevated', () => {
    const m = inferMood(nullInput({ localHour: 3 }));
    expect(m.fatigued).toBeGreaterThanOrEqual(0.4);
  });

  it('curious uses returns + bioExpandRate', () => {
    const m = inferMood(nullInput({
      recentReturnCount: 3,
      bioExpandRate: 0.4,
    }));
    expect(m.curious).toBeGreaterThan(0.7);
  });

  it('curious without bioExpandRate uses returns only', () => {
    const m = inferMood(nullInput({ recentReturnCount: 5 }));
    expect(m.curious).toBeCloseTo(1.0, 5);
  });
});

describe('inferMood — bounds', () => {
  it('extreme rageClickRate is bounded to 1.0', () => {
    const m = inferMood(nullInput({ rageClickRate: 9999, recentRegretCount: 9999 }));
    expect(m.rage).toBeLessThanOrEqual(1);
    expect(m.rage).toBeGreaterThan(0.9);
  });

  it('every dim ∈ [0,1] over a stress sweep', () => {
    for (let rage = 0; rage <= 2; rage += 0.5) {
      for (let regret = 0; regret <= 20; regret += 5) {
        for (const hour of [3, 12, 23]) {
          const m = inferMood(nullInput({
            rageClickRate: rage, recentRegretCount: regret, localHour: hour,
            dwellVariance: 2000, recentReturnCount: 7, bioExpandRate: 0.6,
          }));
          expect(isInBounds(m)).toBe(true);
        }
      }
    }
  });
});

describe('isLowMood', () => {
  it('rage > 0.6 → low mood', () => {
    expect(isLowMood({ ...NEUTRAL_MOOD, rage: 0.7 })).toBe(true);
  });

  it('fatigued > 0.7 → low mood', () => {
    expect(isLowMood({ ...NEUTRAL_MOOD, fatigued: 0.75 })).toBe(true);
  });

  it('low receptive + low curious → low mood', () => {
    expect(isLowMood({ ...NEUTRAL_MOOD, receptive: 0.3, curious: 0.3 })).toBe(true);
  });

  it('neutral mood → not low', () => {
    expect(isLowMood(NEUTRAL_MOOD)).toBe(false);
  });
});

describe('inferMood — determinism', () => {
  it('same input → identical output', () => {
    const input = nullInput({
      rageClickRate: 0.3, dwellVariance: 1500, localHour: 14,
      recentRegretCount: 2, recentReturnCount: 1, bioExpandRate: 0.2,
    });
    const a = inferMood(input);
    const b = inferMood(input);
    expect(a).toEqual(b);
  });
});
