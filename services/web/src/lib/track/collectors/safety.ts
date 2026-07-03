/**
 * Safety + match-state telemetry — v6.5.
 *
 * These are explicit user actions, not auto-DOM events. Wire each helper
 * from the corresponding UI handler (BlockButton.onClick, ReportDialog
 * .onSubmit, MatchCard.onUnmatch, etc.). The underlying safety API call
 * is the source of truth — these helpers only emit a tracking event so
 * the learner can downweight similar candidates in future ranking.
 *
 * Surface values match the UI surface where the action happened:
 *   'discover' | 'matches' | 'messages' | 'profile' | 'dtm'.
 */

import { track } from '../index';

export type SafetySurface =
  | 'discover'
  | 'matches'
  | 'messages'
  | 'profile'
  | 'dtm';

export type SafetyReportReason =
  | 'spam'
  | 'inappropriate'
  | 'fake'
  | 'underage'
  | 'harassment'
  | 'other';

export const safetyTracker = {
  block(tid: string, surface?: SafetySurface): void {
    track('safety.block', surface ? { tid, surface } : { tid });
  },

  report(tid: string, reason: SafetyReportReason, surface?: SafetySurface): void {
    track('safety.report', surface ? { tid, reason, surface } : { tid, reason });
  },

  unmatch(matchId: string, tid?: string, surface?: SafetySurface): void {
    const p: Record<string, unknown> = { matchId };
    if (tid) p.tid = tid;
    if (surface) p.surface = surface;
    track('discover.unmatch', p);
  },

  hold(matchId: string, tid?: string): void {
    track('match.hold', tid ? { matchId, tid } : { matchId });
  },

  unhold(matchId: string, tid?: string): void {
    track('match.unhold', tid ? { matchId, tid } : { matchId });
  },
};
