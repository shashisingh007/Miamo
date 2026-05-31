import { describe, it, expect } from 'vitest';
import {
  evaluateFeatureFlag,
  flagBucket,
  type FeatureFlagDefinition,
} from '../featureFlagEvaluator';

const base: FeatureFlagDefinition = {
  key: 'new_feed',
  enabled: true,
  rolloutPct: 100,
  defaultVariant: 'on',
  offVariant: 'off',
};

describe('featureFlagEvaluator', () => {
  it('flagBucket is deterministic per (flag, subject)', () => {
    const a = flagBucket('x', 'u1');
    const b = flagBucket('x', 'u1');
    expect(a).toBe(b);
  });

  it('flagBucket is in [0, 9999]', () => {
    for (let i = 0; i < 50; i++) {
      const b = flagBucket('feature_z', `user_${i}`);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(9999);
    }
  });

  it('returns off when disabled', () => {
    const r = evaluateFeatureFlag({ ...base, enabled: false }, 'u1');
    expect(r.variant).toBe('off');
    expect(r.reason).toBe('disabled');
  });

  it('returns off when rollout is 0%', () => {
    const r = evaluateFeatureFlag({ ...base, rolloutPct: 0 }, 'u1');
    expect(r.reason).toBe('outside_rollout');
  });

  it('returns default when rollout is 100% and no rules', () => {
    const r = evaluateFeatureFlag(base, 'u1');
    expect(r.variant).toBe('on');
    expect(r.reason).toBe('default');
  });

  it('rule takes precedence over default when matched', () => {
    const r = evaluateFeatureFlag(
      {
        ...base,
        rules: [{ variant: 'premium', when: { plan: ['pro', 'enterprise'] } }],
      },
      'u1',
      { plan: 'pro' }
    );
    expect(r.variant).toBe('premium');
    expect(r.reason).toBe('targeted');
  });

  it('rule predicates AND across attributes', () => {
    const def: FeatureFlagDefinition = {
      ...base,
      rules: [
        {
          variant: 'beta',
          when: { plan: ['pro'], region: ['us', 'ca'] },
        },
      ],
    };
    expect(
      evaluateFeatureFlag(def, 'u1', { plan: 'pro', region: 'us' }).variant
    ).toBe('beta');
    expect(
      evaluateFeatureFlag(def, 'u1', { plan: 'pro', region: 'eu' }).reason
    ).toBe('default');
  });

  it('first matching rule wins (order matters)', () => {
    const def: FeatureFlagDefinition = {
      ...base,
      rules: [
        { variant: 'first', when: { plan: ['pro'] } },
        { variant: 'second', when: { plan: ['pro'] } },
      ],
    };
    expect(evaluateFeatureFlag(def, 'u1', { plan: 'pro' }).variant).toBe('first');
  });

  it('partial rollout is stable per subject (idempotent)', () => {
    const def = { ...base, rolloutPct: 50 };
    const r1 = evaluateFeatureFlag(def, 'subject_42');
    const r2 = evaluateFeatureFlag(def, 'subject_42');
    expect(r1.variant).toBe(r2.variant);
    expect(r1.bucket).toBe(r2.bucket);
  });

  it('partial rollout splits the population approximately by pct', () => {
    const def = { ...base, rolloutPct: 25 };
    let on = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (evaluateFeatureFlag(def, `user_${i}`).variant === 'on') on++;
    }
    const ratio = on / N;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.3);
  });

  it('clamps invalid rolloutPct values', () => {
    expect(evaluateFeatureFlag({ ...base, rolloutPct: 200 }, 'u1').reason).toBe('default');
    expect(evaluateFeatureFlag({ ...base, rolloutPct: -10 }, 'u1').reason).toBe(
      'outside_rollout'
    );
  });

  it('rule with missing attribute falls through to default', () => {
    const def: FeatureFlagDefinition = {
      ...base,
      rules: [{ variant: 'targeted', when: { plan: ['pro'] } }],
    };
    expect(evaluateFeatureFlag(def, 'u1', {}).reason).toBe('default');
  });

  it('null attribute can match when explicitly listed', () => {
    const def: FeatureFlagDefinition = {
      ...base,
      rules: [{ variant: 'anon', when: { userId: [null] } }],
    };
    expect(evaluateFeatureFlag(def, 'u1', { userId: null }).variant).toBe('anon');
  });
});
