/**
 * dtmRetention \u2014 DTM Phase 20 (GDPR) retention plan.
 *
 * Classifies each piece of DTM-derived data by retention tier and emits a
 * concrete action list when a user requests erasure / export. Mirrors the
 * generic `erasurePlan` but is DTM-aware so we never accidentally keep
 * a per-topic vector after the user revoked consent for DTM scoring.
 *
 *  Tiers:
 *    'erase'  \u2014 wipe immediately (raw answer text, free-text reasoning).
 *    'rotate' \u2014 keep aggregate, regenerate identifier (cohort, hash bucket).
 *    'retain' \u2014 keep (audit log of consent state changes is legally required).
 *
 * Pure & deterministic.
 */
export type DtmRetentionField =
  | 'rawAnswerText'
  | 'freeTextReason'
  | 'topicVector'
  | 'topicCoverage'
  | 'driftScore'
  | 'cohortAssignment'
  | 'cohortHashBucket'
  | 'consentAuditLog'
  | 'gdprErasureEvent';

export type DtmRetentionTier = 'erase' | 'rotate' | 'retain';

export type DtmRetentionAction = {
  field: DtmRetentionField;
  tier: DtmRetentionTier;
};

const TIER_MAP: Record<DtmRetentionField, DtmRetentionTier> = {
  rawAnswerText:     'erase',
  freeTextReason:    'erase',
  topicVector:       'erase',
  topicCoverage:     'erase',
  driftScore:        'erase',
  cohortAssignment:  'rotate',
  cohortHashBucket:  'rotate',
  consentAuditLog:   'retain',
  gdprErasureEvent:  'retain',
};

export function dtmRetentionTier(field: DtmRetentionField): DtmRetentionTier {
  return TIER_MAP[field];
}

export function dtmErasurePlan(): DtmRetentionAction[] {
  return (Object.keys(TIER_MAP) as DtmRetentionField[]).map((field) => ({
    field, tier: TIER_MAP[field],
  }));
}

/** Returns only the fields that must be wiped synchronously. */
export function dtmFieldsToErase(): DtmRetentionField[] {
  return dtmErasurePlan().filter((a) => a.tier === 'erase').map((a) => a.field);
}
