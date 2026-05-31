import { describe, it, expect } from 'vitest';
import { evalFeatureFlag } from '../featureFlagEval';

describe('featureFlagEval', () => {
  it('default off at 0%', () => {
    expect(evalFeatureFlag({ flag: 'f', uid: 'u' })).toEqual({ enabled: false, reason: 'default_off', bucket: 0 });
  });

  it('on at 100%', () => {
    expect(evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: 100 }).enabled).toBe(true);
  });

  it('killSwitch beats everything', () => {
    const r = evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: 100, enabledGlobally: true, killSwitch: true });
    expect(r).toEqual({ enabled: false, reason: 'kill_switch', bucket: 0 });
  });

  it('enabledGlobally turns on for everyone', () => {
    expect(evalFeatureFlag({ flag: 'f', uid: 'u', enabledGlobally: true }).enabled).toBe(true);
  });

  it('allowList wins over rollout %', () => {
    const r = evalFeatureFlag({ flag: 'f', uid: 'vip', rolloutPercent: 0, allowList: ['vip'] });
    expect(r).toEqual({ enabled: true, reason: 'allow_list', bucket: 0 });
  });

  it('denyList wins over rollout %', () => {
    const r = evalFeatureFlag({ flag: 'f', uid: 'naughty', rolloutPercent: 100, denyList: ['naughty'] });
    expect(r).toEqual({ enabled: false, reason: 'deny_list', bucket: 0 });
  });

  it('deterministic per (uid, flag)', () => {
    const a = evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: 50 });
    const b = evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: 50 });
    expect(a).toEqual(b);
  });

  it('approximate distribution at 30%', () => {
    let on = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (evalFeatureFlag({ flag: 'f', uid: `user_${i}`, rolloutPercent: 30 }).enabled) on++;
    }
    const ratio = on / N;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.35);
  });

  it('monotonic ramp: anyone on at X% is also on at X+10%', () => {
    for (let i = 0; i < 50; i++) {
      const at40 = evalFeatureFlag({ flag: 'f', uid: `u_${i}`, rolloutPercent: 40 }).enabled;
      const at50 = evalFeatureFlag({ flag: 'f', uid: `u_${i}`, rolloutPercent: 50 }).enabled;
      if (at40) expect(at50).toBe(true);
    }
  });

  it('clamps rolloutPercent outside [0,100]', () => {
    expect(evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: -10 }).enabled).toBe(false);
    expect(evalFeatureFlag({ flag: 'f', uid: 'u', rolloutPercent: 999 }).enabled).toBe(true);
  });

  it('invalid inputs', () => {
    expect(evalFeatureFlag({ flag: '', uid: 'u' }).reason).toBe('invalid');
    expect(evalFeatureFlag({ flag: 'f', uid: '' }).reason).toBe('invalid');
  });

  it('bucket is in [0,99] when rollout is used', () => {
    for (let i = 0; i < 50; i++) {
      const r = evalFeatureFlag({ flag: 'f', uid: `u_${i}`, rolloutPercent: 50 });
      expect(r.bucket).toBeGreaterThanOrEqual(0);
      expect(r.bucket).toBeLessThan(100);
    }
  });
});
