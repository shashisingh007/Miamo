/**
 * dtmPairExplainText \u2014 DTM Phase 11 short-form explainer (pure).
 *
 * Given the result of `explainDtmCompat`, renders a stable, sentence-
 * cased human string suitable for a pair card subtitle. Pure: no i18n,
 * caller is responsible for translation \u2014 we only return canonical
 * topic keys joined with deterministic connectives.
 *
 *   3 supports         -> "You align on values, communication, and goals."
 *   2 supports + 1 risk -> "You align on values and growth, though family may differ."
 *   all risks          -> "You may differ on finance and conflict."
 *   empty              -> ""
 */
import type { DtmTopicKey } from './dtmTopics';

export type DtmExplainTextItem = {
  topic: DtmTopicKey;
  polarity: 'support' | 'risk';
};

const TOPIC_LABEL: Record<DtmTopicKey, string> = {
  values: 'values', lifestyle: 'lifestyle', communication: 'communication',
  intimacy: 'intimacy', family: 'family', finance: 'finance',
  conflict: 'conflict', growth: 'growth', leisure: 'leisure',
  faith: 'faith', ambition: 'ambition', autonomy: 'autonomy',
  social: 'social', health: 'health', parenting: 'parenting', future: 'future',
};

function joinList(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function renderDtmPairExplain(items: DtmExplainTextItem[]): string {
  if (!items.length) return '';
  const supports = items.filter(i => i.polarity === 'support').map(i => TOPIC_LABEL[i.topic]);
  const risks    = items.filter(i => i.polarity === 'risk').map(i => TOPIC_LABEL[i.topic]);

  if (supports.length && risks.length) {
    return `You align on ${joinList(supports)}, though ${joinList(risks)} may differ.`;
  }
  if (supports.length) {
    return `You align on ${joinList(supports)}.`;
  }
  return `You may differ on ${joinList(risks)}.`;
}
