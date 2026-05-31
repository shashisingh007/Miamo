/**
 * v3.1 Tracking — shared event catalog and payload shapes.
 *
 * The contract between the web client SDK, the ingest service, and the
 * downstream aggregation workers. Adding a new event name requires:
 *   1. Add to TrackEventName below
 *   2. Add a payload row to TrackEventPayloadMap (or `{}` if payload-less)
 *   3. Add a Zod entry in services/ingest/src/validate.ts
 *   4. Wire emission from a collector or call site
 *
 * Schema is versioned via SCHEMA_VERSION; consumers may reject mismatched envelopes.
 */

export const SCHEMA_VERSION = 1 as const;

// ─── Event names (stable strings; treat as enum) ──────────────────────────
export type TrackEventName =
  // session / device / consent
  | 'session.start'
  | 'session.heartbeat'
  | 'session.end'
  | 'consent.update'
  // navigation / page
  | 'page.view'
  | 'page.leave'
  | 'route.change'
  // engagement primitives
  | 'impression'
  | 'dwell'
  | 'scroll.depth'
  | 'scroll.idle'
  | 'click'
  | 'click.rage'
  | 'click.dead'
  | 'cursor.sample'
  | 'visibility.change'
  // forms
  | 'form.focus'
  | 'form.change'
  | 'form.submit'
  | 'form.error'
  // perf / errors
  | 'perf.web_vitals'
  | 'error.js'
  | 'error.network'
  // feature: discover / swipe / match
  | 'discover.card_view'
  | 'discover.swipe'
  | 'discover.match'
  | 'discover.boost_view'
  // feature: messaging
  | 'msg.thread_open'
  | 'msg.compose_start'
  | 'msg.send'
  | 'msg.read'
  | 'msg.reaction'
  | 'msg.voice_record'
  // feature: profile / album
  | 'profile.view'
  | 'profile.edit'
  | 'album.upload'
  | 'album.view'
  | 'album.unlock_request'
  // feature: DTM / quiz / vibe / persona
  | 'dtm.question_view'
  | 'dtm.answer'
  | 'dtm.complete'
  | 'vibe.check_start'
  | 'vibe.check_complete'
  // feature: beats / moves / date planner
  | 'beats.play'
  | 'beats.skip'
  | 'moves.play'
  | 'date.plan_open'
  | 'date.plan_save'
  // ─── v4 additions ──────────────────────────────────────────────────
  // attention / idle / passive
  | 'attention.idle'
  | 'attention.away'
  | 'attention.return'
  | 'attention.long_heartbeat'
  // card-level interactions (Discover stack)
  | 'card.impression.50'
  | 'card.impression.100'
  | 'card.bio.expand'
  | 'card.bio.collapse'
  | 'card.photo.swipe'
  | 'card.hover'
  // swipe decision telemetry
  | 'swipe.start'
  | 'swipe.abort'
  | 'swipe.commit'
  | 'swipe.undo'
  | 'swipe.regret'
  | 'swipe.repeat_pass'
  // discovery filters & search (no raw text leaves device)
  | 'filter.open'
  | 'filter.change'
  | 'filter.apply'
  | 'filter.reset'
  | 'search.query'
  | 'search.result_click'
  | 'search.no_results'
  // notifications
  | 'notification.shown'
  | 'notification.opened'
  | 'notification.dismissed'
  | 'notification.snoozed'
  // media
  | 'media.photo.zoom'
  | 'media.video.play'
  | 'media.video.pause'
  | 'media.video.seek'
  | 'media.video.complete'
  // lifecycle
  | 'lifecycle.network'
  | 'lifecycle.fullscreen'
  // intent micro-signals
  | 'intent.cta.hover'
  | 'intent.price.hover'
  | 'intent.profile.settle'
  | 'intent.bookmark'
  | 'intent.screenshot'
  | 'intent.copy'
  // chat micro-signals
  | 'chat.typing.start'
  | 'chat.typing.stop'
  | 'chat.draft_deleted'
  | 'chat.scroll_history'
  // perf / error extensions
  | 'error.long_task'
  | 'error.slow_api'
  | 'error.sse_disconnect'
  | 'error.sse_reconnect'
  // ─── v6 additions — total-state tracking ───────────────────────────
  // explicit idle lifecycle (paired enter/exit so downstream can join)
  | 'attention.idle.enter'
  | 'attention.idle.exit'
  // richer navigation: from/to/mode/intent in payload
  | 'nav.route'
  // element-level focus (debounced 250ms, payload: route, elementId)
  | 'focus.element'
  // element-level dwell (payload: route, elementId, dwellMs, scrollY)
  | 'intent.dwell'
  // derived session-end rollup (produced by tracking-worker, not client)
  | 'session.summary'
  // user exits own profile after dwelling (payload: dwellMs)
  | 'profile.self_view_dwell'
  // user hovers/pauses on a filter chip before applying (payload: chipId, hesitationMs)
  | 'filter.hesitation'
  // user re-records a voice note (payload: takeCount)
  | 'msg.voice_rerecord'
  // user opens notifications, dismisses all, opens none
  | 'notif.look_no_act'
  // user quits DTM mid-session (payload: answered, remaining)
  | 'dtm.partial_abandon'
  // ─── v6.5 — safety + first-move + dtm extras ───────────────────────
  // safety actions (always logged, gated only by analytics consent — the
  // underlying safety API call is a separate first-class write).
  | 'safety.block'
  | 'safety.report'
  | 'discover.unmatch'
  // user holds / unholds a match (neutral signal, "let me think")
  | 'match.hold'
  | 'match.unhold'
  // user skips a DTM question
  | 'dtm.question_skip'
  // user changes a previously-given DTM answer
  | 'dtm.answer_revise'
  // ─── v6.6 — see-later pile + batch-exhausted + skipped review ────────────────
  // user defers a profile to review later (4th action alongside left/right/super).
  | 'discover.see_later'
  // user opens a previously-deferred profile from the see-later pile.
  | 'discover.see_later.view'
  // current 10-card batch is exhausted ("you're all caught up").
  | 'discover.batch.exhausted'
  // user opens the skipped-profiles pile.
  | 'discover.skipped.open'
  // user takes a final action on a previously-skipped profile.
  | 'discover.skipped.action'
  // DTM mirrors of the same three flows.
  | 'dtm.see_later'
  | 'dtm.see_later.view'
  | 'dtm.batch.exhausted'
  // generic
  | 'custom';

export type ContextHeader = {
  /** schema version of the envelope+events */
  v: number;
  /** stable device id (cookie) */
  did: string;
  /** session id (regenerated per visit) */
  sid: string;
  /** user id when known (post-login) */
  uid?: string;
  /** page url path (PII-stripped) */
  path?: string;
  /** referrer host only */
  ref?: string;
  /** ISO locale, e.g. 'en-IN' */
  loc?: string;
  /** timezone offset minutes */
  tzo?: number;
  /** viewport width */
  vw?: number;
  /** viewport height */
  vh?: number;
  /** device pixel ratio */
  dpr?: number;
  /** ua client hint (brand+major only) */
  ua?: string;
  /** consent scopes granted at emit time */
  cs?: string[];
};

export type TrackEvent<N extends TrackEventName = TrackEventName> = {
  /** event name */
  e: N;
  /** client timestamp ms (Date.now at emit) */
  t: number;
  /** monotonic ordinal within session */
  n: number;
  /** payload — shape varies per name */
  p?: Record<string, unknown>;
  /** optional target id for dedupe / aggregation */
  tid?: string;
  /** optional target type ('user' | 'card' | 'message' | ...) */
  tt?: string;
  /** optional duration in ms */
  d?: number;
};

export type TrackEnvelope = {
  ctx: ContextHeader;
  evts: TrackEvent[];
};

/** Maximum events per envelope; client batcher respects this. */
export const MAX_EVENTS_PER_BATCH = 50;
/** Maximum envelope size in bytes (post-stringify) before forced flush. */
export const MAX_ENVELOPE_BYTES = 32 * 1024;
