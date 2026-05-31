/**
 * dtmReanswerPolicy \u2014 DTM Phase 11/16 re-answer scheduler (pure).
 *
 * Decides whether to surface a DTM topic for re-answering. Pull factors:
 *   - confidence has decayed below a floor
 *   - it's been longer than `staleAfterDays` since this topic was touched
 *   - the user explicitly flagged it ("ask me again")
 * Push factors (suppress):
 *   - the user just answered it (`cooldownDays`)
 *   - the user opted this topic out (sensitive topic consent)
 */
import type { DtmTopicKey } from './dtmTopics';

export type DtmReanswerInputs = {
  topic: DtmTopicKey;
  lastAnsweredAtMs: number;     // 0 = never
  topicConfidence: number;      // 0..1
  nowMs: number;
  userFlaggedRetake?: boolean;
  consentBlocked?: boolean;     // from dtmConsentFilter
  cooldownDays?: number;        // default 14
  staleAfterDays?: number;      // default 120
  confidenceFloor?: number;     // default 0.40
};

export type DtmReanswerDecision = {
  shouldAsk: boolean;
  reason: 'asked' | 'never_answered' | 'low_confidence' | 'stale' | 'user_flag' | 'cooldown' | 'consent_blocked';
};

const MS_PER_DAY = 86_400_000;

export function decideDtmReanswer(inp: DtmReanswerInputs): DtmReanswerDecision {
  if (inp.consentBlocked) return { shouldAsk: false, reason: 'consent_blocked' };

  const cool = (inp.cooldownDays ?? 14) * MS_PER_DAY;
  const stale = (inp.staleAfterDays ?? 120) * MS_PER_DAY;
  const floor = inp.confidenceFloor ?? 0.40;

  // never answered
  if (!inp.lastAnsweredAtMs || inp.lastAnsweredAtMs <= 0) {
    return { shouldAsk: true, reason: 'never_answered' };
  }

  const sinceMs = Math.max(0, inp.nowMs - inp.lastAnsweredAtMs);
  if (sinceMs < cool) return { shouldAsk: false, reason: 'cooldown' };

  if (inp.userFlaggedRetake) return { shouldAsk: true, reason: 'user_flag' };
  if (inp.topicConfidence < floor) return { shouldAsk: true, reason: 'low_confidence' };
  if (sinceMs >= stale) return { shouldAsk: true, reason: 'stale' };

  return { shouldAsk: false, reason: 'asked' };
}
