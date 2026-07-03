/**
 * DTM_TOPICS — canonical 16-topic ordering.
 *
 * Single source of truth for topic index → semantic label, mirrored by the
 * keyword table in `services/tracking-worker/src/enrich.ts`. Anything that
 * persists or reads a `DtmVector` MUST use this ordering. Re-ordering or
 * inserting a topic is a breaking change requiring a vector rebuild.
 *
 * Pure module — exported as `readonly` tuples so callers cannot mutate.
 */
export const DTM_TOPIC_COUNT = 16 as const;

export const DTM_TOPIC_KEYS = [
  'values',
  'lifestyle',
  'communication',
  'intimacy',
  'family',
  'finance',
  'conflict',
  'growth',
  'leisure',
  'faith',
  'ambition',
  'autonomy',
  'social',
  'health',
  'parenting',
  'future',
] as const;

export type DtmTopicKey = (typeof DTM_TOPIC_KEYS)[number];

export const DTM_TOPIC_LABELS: Readonly<Record<DtmTopicKey, string>> = {
  values:        'Values',
  lifestyle:     'Lifestyle',
  communication: 'Communication',
  intimacy:      'Intimacy',
  family:        'Family',
  finance:       'Finance',
  conflict:      'Handling conflict',
  growth:        'Growth & learning',
  leisure:       'Leisure',
  faith:         'Faith & spirituality',
  ambition:      'Ambition & career',
  autonomy:      'Autonomy',
  social:        'Social life',
  health:        'Health',
  parenting:     'Parenting',
  future:        'Future plans',
};

export function dtmTopicKey(index: number): DtmTopicKey | null {
  if (!Number.isInteger(index) || index < 0 || index >= DTM_TOPIC_COUNT) return null;
  return DTM_TOPIC_KEYS[index];
}

export function dtmTopicLabel(index: number): string | null {
  const k = dtmTopicKey(index);
  return k ? DTM_TOPIC_LABELS[k] : null;
}
