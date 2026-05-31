/**
 * Pure deterministic feature-flag evaluator.
 *
 * Each flag has:
 *  - enabled: master kill-switch
 *  - rolloutPct: 0..100 stable rollout based on FNV-1a(salt+subjectKey) mod 10000
 *  - targeting rules: ordered AND-predicate match → forces variant
 *  - defaultVariant: returned when included by rollout but no targeting rule matches
 *  - offVariant: returned when disabled or outside rollout
 */

export type FlagAttrValue = string | number | boolean | null | undefined;

export interface FeatureFlagRule {
  variant: string;
  /** all predicates must match (AND); attribute key must equal one of the listed values */
  when: Record<string, ReadonlyArray<FlagAttrValue>>;
}

export interface FeatureFlagDefinition {
  key: string;
  enabled: boolean;
  /** 0..100 inclusive; 0 = no one, 100 = everyone */
  rolloutPct: number;
  defaultVariant: string;
  offVariant: string;
  rules?: ReadonlyArray<FeatureFlagRule>;
}

export type FlagEvaluationReason =
  | 'disabled'
  | 'outside_rollout'
  | 'targeted'
  | 'default';

export interface FlagEvaluation {
  flag: string;
  variant: string;
  reason: FlagEvaluationReason;
  bucket: number; // 0..9999
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function flagBucket(flagKey: string, subjectKey: string): number {
  return fnv1a(`${flagKey}:${subjectKey}`) % 10_000;
}

function ruleMatches(
  rule: FeatureFlagRule,
  attrs: Record<string, FlagAttrValue>
): boolean {
  for (const [k, allowed] of Object.entries(rule.when)) {
    const actual = attrs[k];
    if (!allowed.some((v) => v === actual)) return false;
  }
  return true;
}

export function evaluateFeatureFlag(
  def: FeatureFlagDefinition,
  subjectKey: string,
  attrs: Record<string, FlagAttrValue> = {}
): FlagEvaluation {
  const bucket = flagBucket(def.key, subjectKey);
  if (!def.enabled) {
    return { flag: def.key, variant: def.offVariant, reason: 'disabled', bucket };
  }
  const pct = Math.max(0, Math.min(100, def.rolloutPct));
  const threshold = Math.round(pct * 100); // → 0..10000
  if (bucket >= threshold) {
    return { flag: def.key, variant: def.offVariant, reason: 'outside_rollout', bucket };
  }
  for (const rule of def.rules ?? []) {
    if (ruleMatches(rule, attrs)) {
      return { flag: def.key, variant: rule.variant, reason: 'targeted', bucket };
    }
  }
  return { flag: def.key, variant: def.defaultVariant, reason: 'default', bucket };
}
