/**
 * dtmConsentFilter \u2014 DTM Phase 11 / Phase 20 consent gate (pure).
 *
 * Some DTM topics (faith, finance, family, intimacy, parenting) carry
 * extra sensitivity. The user can opt them out of *outgoing* explanations
 * shown on their profile. This filter projects a `DtmTopicHint[]` /
 * `DtmCompatItem[]` through their consent preferences before render.
 */
import type { DtmTopicKey } from './dtmTopics';

export const DTM_SENSITIVE_TOPICS = ['faith', 'finance', 'family', 'intimacy', 'parenting'] as const satisfies readonly DtmTopicKey[];

export type DtmConsentPrefs = Partial<Record<DtmTopicKey, boolean>>; // true = allow share

export type DtmShareItem = { topic: DtmTopicKey };

export type DtmConsentFilterResult<T extends DtmShareItem> = {
  visible: T[];
  redactedCount: number;
};

/**
 * Default policy:
 *   - Sensitive topics: blocked unless prefs[topic] === true.
 *   - Non-sensitive topics: shown unless prefs[topic] === false.
 */
export function isTopicShareable(topic: DtmTopicKey, prefs: DtmConsentPrefs | null | undefined): boolean {
  const explicit = prefs?.[topic];
  if (DTM_SENSITIVE_TOPICS.includes(topic as typeof DTM_SENSITIVE_TOPICS[number])) {
    return explicit === true;
  }
  return explicit !== false;
}

export function filterDtmByConsent<T extends DtmShareItem>(
  items: T[],
  prefs: DtmConsentPrefs | null | undefined,
): DtmConsentFilterResult<T> {
  const visible: T[] = [];
  let redacted = 0;
  for (const it of items) {
    if (isTopicShareable(it.topic, prefs)) visible.push(it);
    else redacted++;
  }
  return { visible, redactedCount: redacted };
}
