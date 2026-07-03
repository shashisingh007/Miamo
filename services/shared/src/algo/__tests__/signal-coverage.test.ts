/**
 * Signal-coverage guard — fails CI if a tracked event becomes dead data.
 *
 * Every TrackEventName must be EITHER:
 *   (a) consumed by at least one v4 algorithm (registered via registry.ts), OR
 *   (b) explicitly listed in OPERATIONAL_EVENTS below with a one-line reason.
 *
 * Adding a new event without doing one of the two will fail this test. That
 * is intentional: per docs/ALGORITHMS_V4_PROMPT.md §5 — "no dead data".
 */
import { describe, it, expect } from 'vitest';
import { usedEvents, getRegistry } from '../../algo/registry';
// Importing each algo registers its event set as a side effect.
import '../../algo/forYou';
import '../../algo/aiPicks';
import '../../algo/moves';
import '../../algo/new';
import '../../algo/active';
import '../../algo/verified';
import '../../algo/serious';
import '../../algo/dtm';
import '../../algo/cf';
import '../../algo/messageSuggest';
import '../../algo/beats';
import '../../algo/notifyTiming';
import '../../algo/searchAugment';
import '../../algo/feedAugment';
import '../../algo/postImpressionRerank';
import '../../algo/aiMatch';
// v6 algorithm registrations (claim a subset of the v6 events; the rest stay OPERATIONAL until further v6 algos ship).
import '../../algo/forYouV6';

import * as fs from 'fs';
import * as path from 'path';

/** Events that are intentionally not consumed by any ranker. */
const OPERATIONAL_EVENTS = new Set<string>([
  'consent.update',         // routed to ConsentEvent table, not a ranking signal
  'page.view',              // navigation only
  'page.leave',             // navigation only
  'route.change',           // navigation only
  'impression',             // generic; aggregated as discover.card_view downstream
  'dwell',                  // aggregated into FeatureSnapshot.attentionProfile
  'scroll.idle',            // attention signal already captured via scroll.depth
  'visibility.change',      // session-state only
  'cursor.sample',          // attention; folded into attentionProfile via worker
  'form.focus',             // funnel analytics
  'form.change',            // funnel analytics
  'form.submit',            // funnel analytics
  'form.error',             // funnel analytics
  'perf.web_vitals',        // operational
  'error.js',               // operational
  'error.network',          // operational
  'discover.boost_view',    // boost telemetry
  'profile.edit',           // attribute change; feeds FeatureSnapshot completeness only
  'album.upload',           // creator funnel
  'album.view',             // attention; folded via dwell
  'album.unlock_request',   // revenue funnel
  'vibe.check_start',       // funnel
  'vibe.check_complete',    // feeds vibeEmb via feature loop (no direct ranker)
  'date.plan_open',         // funnel
  'date.plan_save',         // funnel
  'custom',                 // by definition unrestricted
  // ─── v4 additions ──────────────────────────────────────────────
  'card.bio.collapse',        // paired with bio.expand; only expand is a ranking signal
  'card.photo.swipe',         // within-card nav; folded into attentionProfile via worker
  'card.hover',               // attention; folded into FeatureSnapshot
  'swipe.abort',              // funnel only; non-decision so not a ranking signal
  'media.photo.zoom',         // attention; folded via dwell
  'media.video.play',         // attention; folded via dwell
  'media.video.pause',        // attention; folded via dwell
  'media.video.seek',         // attention; folded via dwell
  'media.video.complete',     // attention; folded via dwell
  'lifecycle.network',        // operational
  'lifecycle.fullscreen',     // operational
  'intent.cta.hover',         // funnel; revenue analytics
  'intent.price.hover',       // funnel; revenue analytics
  'intent.bookmark',          // user-organised list; reserved for a future bookmark surface
  'intent.screenshot',        // safety + revenue signal; reserved
  'intent.copy',              // safety + revenue signal; reserved
  'error.long_task',          // operational
  'error.slow_api',           // operational
  'error.sse_disconnect',     // operational
  'error.sse_reconnect',      // operational
  // ─── v6 additions — total-state tracking ─────────────────────────
  // Claimed operationally until v6 algorithm dispatchers wire them up
  // (see docs/TRACKING.md collectors and docs/ALGORITHMS.md discoverPolicy).
  // NOTE: forYouV6 (Phase 3) claims attention.idle.enter/exit, nav.route,
  // session.summary, profile.self_view_dwell, intent.dwell — those moved
  // into the algo registry and are removed from OPERATIONAL_EVENTS.
  'focus.element',            // v6 reserved: feedAugmentV6 (focusAffinityByKind)
  'filter.hesitation',        // v6 reserved: feedAugmentV6 (filterHesitationDamping)
  'msg.voice_rerecord',       // v6 reserved: messageSuggestV6 (composure signal)
  'notif.look_no_act',        // v6 reserved: notifyTimingV6 (silent-dismiss back-off)
  'dtm.partial_abandon',      // v6 reserved: dtmV6 (question-order reranker)
  // ─── v6.5 — safety + match-state + dtm extras ────────────────────
  // Reserved for the v6.5 learner loop (LEARNING_SYSTEM_V6_5.md Phase D).
  // SafetyAgg / FirstMoveOutcome rollups are wired but no ranker reads
  // them yet; they ship as data first, consumers second.
  'safety.block',             // v6.5 reserved: learner negative reward + blacklist
  'safety.report',            // v6.5 reserved: learner negative reward + safety queue
  'discover.unmatch',         // v6.5 reserved: learner regret signal post-match
  'match.hold',               // v6.5 reserved: neutral signal, do not penalize
  'match.unhold',             // v6.5 reserved: neutral signal, do not penalize
  'dtm.question_skip',        // v6.5 reserved: dtmV6 question-order rerank
  'dtm.answer_revise',        // v6.5 reserved: dtmV6 answer-confidence calibrator
  // ─── v6.6 reserved (see-later pile + batch flow) ───
  'discover.see_later',         // v6.6 reserved: learner soft-defer signal
  'discover.see_later.view',    // v6.6 reserved: learner re-engagement signal
  'discover.batch.exhausted',   // v6.6 reserved: discoverPolicy "all caught up"
  'discover.skipped.open',      // v6.6 reserved: discoverPolicy skipped pile open
  'discover.skipped.action',    // v6.6 reserved: learner late-decision attribution
  'dtm.see_later',              // v6.6 reserved: dtmV6 deferral signal
  'dtm.see_later.view',         // v6.6 reserved: dtmV6 re-engagement signal
  'dtm.batch.exhausted',        // v6.6 reserved: dtmV6 batch completion telemetry
  // ─── v8 (v3.6.0) — algorithm-overhaul foundation events ───
  // Schemas live in v6Validators.ts; consumers ship in subsequent v8
  // ranker phases. Until those land, the events are routed to the v8
  // aggregator tables (intent/mood snapshots, exposure ledger, move
  // outcomes, family-brief audit, dtm topic-mask audit, chat-deposit
  // ledger) which are read directly by the v8 algos (not via the v4
  // algo registry).
  'intent.snapshot',            // v8 reserved: intentRightNow snapshot table
  'engagement.depth_scored',    // v8 reserved: depth feature in multiObjective scorer
  'mood.inferred',              // v8 reserved: moodRightNow snapshot table
  'polarity.computed',          // v8 reserved: polarity feature in negativeSignalEngine
  'exposure.credit_earned',     // v8 reserved: exposureLedger.appendLedger
  'exposure.slot_filled',       // v8 reserved: exposureLedger debit + fairness audit
  'move.composed',              // v8 reserved: moveV2 composer telemetry
  'move.suggestion_accepted',   // v8 reserved: moveV2 acceptance KPI
  'voice_fingerprint.shown',    // v8 reserved: senderVoice exposure metric
  'voice_fingerprint.shared',   // v8 reserved: senderVoice virality metric
  'family_brief.generated',     // v8 reserved: familyBrief generation audit
  'family_brief.viewed',        // v8 reserved: familyBrief privacy-token audit
  'chat.deposit_made',          // v8 reserved: antiGhost spotlightLedger deposit
  'chat.reply_bonus_paid',      // v8 reserved: antiGhost spotlightLedger reply bonus
  'chat.ghost_burn',            // v8 reserved: antiGhost spotlightLedger ghost penalty
  'dtm.topic_masked',           // v8 reserved: dtmTopicMask suppression audit
  // ─── v9 (v3.7) — Temporal Learning v2 ───
  'preference.drift_detected',  // v9 reserved: preferenceWindows worker emits;
                                //   consumed by v9 rankers (behind ALGO_V9_TEMPORAL_LEARNING_ENABLED).
]);

function readTrackedEventNames(): string[] {
  // Parse the TrackEventName union directly so we don't need a separate enum.
  const file = path.resolve(__dirname, '..', '..', 'track', 'events.ts');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('export type TrackEventName');
  const semi = src.indexOf(';', start);
  const block = src.slice(start, semi);
  const out = new Set<string>();
  for (const m of block.matchAll(/'([a-z][a-z0-9._]+)'/g)) out.add(m[1]);
  return [...out];
}

describe('signal coverage', () => {
  const all = readTrackedEventNames();

  it('event catalog is non-empty (parser sanity)', () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it('every tracked event is consumed by an algo OR explicitly operational', () => {
    const consumed = usedEvents();
    const dead: string[] = [];
    for (const e of all) {
      if (consumed.has(e)) continue;
      if (OPERATIONAL_EVENTS.has(e)) continue;
      dead.push(e);
    }
    expect(dead).toEqual([]);
  });

  it('OPERATIONAL_EVENTS does not silently shadow events also claimed by an algo', () => {
    const consumed = usedEvents();
    const overlap = [...OPERATIONAL_EVENTS].filter((e) => consumed.has(e));
    expect(overlap).toEqual([]);
  });

  it('every registered algo declares at least one event', () => {
    for (const a of getRegistry()) {
      expect(a.usesEvents.length, `${a.name} declares no events`).toBeGreaterThan(0);
    }
  });

  it('every registered algo lists only events that actually exist', () => {
    const known = new Set(all);
    const unknown: Array<{ algo: string; evt: string }> = [];
    for (const a of getRegistry()) {
      for (const e of a.usesEvents) {
        // skip pseudo-signals (worker-derived buckets) prefixed elsewhere
        if (known.has(e)) continue;
        unknown.push({ algo: a.name, evt: e });
      }
    }
    expect(unknown).toEqual([]);
  });
});
