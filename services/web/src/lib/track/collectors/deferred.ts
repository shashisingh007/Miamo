/**
 * v6.6 — see-later pile + batch / skipped-pile collectors.
 *
 * Discover and DTM share the same UX vocabulary:
 *   - cross / tick / super-tick are the existing three swipe actions.
 *   - "see later" is the fourth action — defer this card / question to a
 *     personal pile the user can open from the "all caught up" screen.
 *
 * These helpers ONLY emit tracking events. The actual server-side defer
 * (POST /v1/defer or equivalent) is a separate API call, since the
 * deferred pile is durable state, not just analytics.
 */
import { track } from '../index';

export type SeeLaterReason = 'not_now' | 'thinking' | 'unsure' | 'other';

/** Record that a profile was deferred ("see later" 4th action). */
export function trackDiscoverSeeLater(args: {
  tid: string;
  batchId?: string;
  reason?: SeeLaterReason;
}): void {
  track('discover.see_later', {
    tid: args.tid,
    ...(args.batchId ? { batchId: args.batchId } : {}),
    ...(args.reason  ? { reason:  args.reason  } : {}),
  });
}

/** Record that the user opened a previously-deferred profile from the pile. */
export function trackDiscoverSeeLaterView(args: {
  tid: string;
  /** Time elapsed between defer and view, in ms. */
  ageMs?: number;
}): void {
  track('discover.see_later.view', {
    tid: args.tid,
    ...(args.ageMs != null ? { ageMs: args.ageMs } : {}),
  });
}

/** Record that the current 10-card batch is exhausted ("you're all caught up"). */
export function trackDiscoverBatchExhausted(args: {
  batchId: string;
  shown: number;
  acted: number;
  deferred: number;
  durationMs?: number;
}): void {
  track('discover.batch.exhausted', { ...args });
}

/** Record that the user opened the skipped-profiles pile UI. */
export function trackDiscoverSkippedOpen(pileSize: number): void {
  track('discover.skipped.open', { pileSize });
}

/** Record that the user finally took an action on a previously-skipped profile. */
export function trackDiscoverSkippedAction(args: {
  tid: string;
  action: 'like' | 'pass' | 'super_like' | 'see_later';
}): void {
  track('discover.skipped.action', { ...args });
}

/** DTM equivalents — same flow, different surface. */
export function trackDtmSeeLater(topic: string, qid: string): void {
  track('dtm.see_later', { topic, qid });
}

export function trackDtmSeeLaterView(args: { topic: string; qid: string; ageMs?: number }): void {
  track('dtm.see_later.view', {
    topic: args.topic,
    qid: args.qid,
    ...(args.ageMs != null ? { ageMs: args.ageMs } : {}),
  });
}

export function trackDtmBatchExhausted(args: {
  topic: string;
  shown: number;
  answered: number;
  skipped: number;
  deferred: number;
  durationMs?: number;
}): void {
  track('dtm.batch.exhausted', { ...args });
}
