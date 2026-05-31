/**
 * featureFlagEval \u2014 Phase 13 deterministic percentage-rollout evaluator (pure).
 *
 * Decides whether a feature is enabled for a given (uid, flag) tuple.
 * Layered precedence:
 *   1. allowList (uid match) -> on
 *   2. denyList  (uid match) -> off
 *   3. rolloutPercent (0-100) bucketed by hash(uid + ":" + flag)
 *
 * Pure and stable: same inputs always yield the same answer; ramping
 * percentage strictly grows the cohort (monotonic guarantee).
 */
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export type FeatureFlagInputs = {
  flag: string;
  uid: string;
  rolloutPercent?: number;       // default 0
  allowList?: string[];          // exact uids always on
  denyList?: string[];           // exact uids always off
  enabledGlobally?: boolean;     // hard on for everyone
  killSwitch?: boolean;          // hard off for everyone (highest precedence)
};

export type FeatureFlagResult = {
  enabled: boolean;
  reason: 'kill_switch' | 'global' | 'allow_list' | 'deny_list' | 'rollout' | 'rollout_excluded' | 'default_off' | 'invalid';
  bucket: number; // 0..99
};

export function evalFeatureFlag(inp: FeatureFlagInputs): FeatureFlagResult {
  if (typeof inp.flag !== 'string' || inp.flag === '' || typeof inp.uid !== 'string' || inp.uid === '') {
    return { enabled: false, reason: 'invalid', bucket: 0 };
  }
  if (inp.killSwitch) return { enabled: false, reason: 'kill_switch', bucket: 0 };
  if (inp.enabledGlobally) return { enabled: true, reason: 'global', bucket: 0 };

  if (inp.allowList?.includes(inp.uid)) return { enabled: true, reason: 'allow_list', bucket: 0 };
  if (inp.denyList?.includes(inp.uid)) return { enabled: false, reason: 'deny_list', bucket: 0 };

  const pct = Math.max(0, Math.min(100, Math.floor(inp.rolloutPercent ?? 0)));
  if (pct <= 0) return { enabled: false, reason: 'default_off', bucket: 0 };
  if (pct >= 100) return { enabled: true, reason: 'rollout', bucket: 0 };

  const bucket = fnv1a32(`${inp.uid}:${inp.flag}`) % 100;
  return bucket < pct
    ? { enabled: true, reason: 'rollout', bucket }
    : { enabled: false, reason: 'rollout_excluded', bucket };
}
