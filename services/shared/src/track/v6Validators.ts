/**
 * v6 event payload validators (Phase 2 schema gap closeout).
 *
 * Zod schemas for the 11 v6 event names added to TrackEventName. Used by
 * the ingest service to reject malformed payloads at the boundary
 * (defence-in-depth — TypeScript types alone don't protect the worker).
 *
 * Convention: every payload is a plain object, fields are optional unless
 * derivation logic strictly requires them. Unknown extra fields are
 * stripped (default Zod behaviour) so client-side experiments don't
 * accidentally leak through.
 */
import { z } from 'zod';
import type { TrackEventName } from './events';

const route = z.string().min(1).max(256);
const elementId = z.string().min(1).max(128);
const positiveMs = z.number().int().nonnegative().max(24 * 60 * 60 * 1000);

export const AttentionIdleEnterSchema = z.object({
  route: route.optional(),
  reason: z.enum(['inactivity', 'visibility', 'blur']).optional(),
});

export const AttentionIdleExitSchema = z.object({
  route: route.optional(),
  idleMs: positiveMs.optional(),
});

export const NavRouteSchema = z.object({
  path: route.optional(),
  to: route.optional(),
  from: route.optional(),
  ts: z.number().int().nonnegative().optional(),
}).refine((v) => v.path != null || v.to != null, {
  message: 'nav.route requires `path` or `to`',
});

export const FocusElementSchema = z.object({
  route: route,
  elementId: elementId,
  dwellMs: positiveMs.optional(),
});

export const IntentDwellSchema = z.object({
  route: route,
  elementId: elementId.optional(),
  dwellMs: positiveMs,
  intentTag: z.string().max(64).optional(),
});

export const SessionSummarySchema = z.object({
  sessionId: z.string().min(1).max(64),
  durationMs: positiveMs,
  swipes: z.number().int().nonnegative().optional(),
  msgsSent: z.number().int().nonnegative().optional(),
  msgsRead: z.number().int().nonnegative().optional(),
  cardsViewed: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  zeroActionSession: z.boolean().optional(),
  windowShopping: z.boolean().optional(),
  ghostedSelf: z.boolean().optional(),
});

export const ProfileSelfViewDwellSchema = z.object({
  dwellMs: positiveMs,
  section: z.string().max(64).optional(),
});

export const FilterHesitationSchema = z.object({
  filter: z.string().min(1).max(64),
  hesitationMs: positiveMs,
  appliedInEnd: z.boolean().optional(),
});

export const MsgVoiceRerecordSchema = z.object({
  threadId: z.string().min(1).max(128),
  attempt: z.number().int().min(1).max(20),
  abandonedMs: positiveMs.optional(),
});

export const NotifLookNoActSchema = z.object({
  notifId: z.string().min(1).max(128),
  dwellMs: positiveMs,
  channel: z.enum(['push', 'inapp', 'email']).optional(),
});

export const DtmPartialAbandonSchema = z.object({
  questionsAnswered: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
  lastQuestionId: z.string().max(128).optional(),
});

// ─── v6.5: safety + first-move + dtm extras ───────────────────────
// `surface` is where the action happened in the product; not all callers
// will have it (e.g. an unmatch from a deep-link), so it stays optional.
const surface = z.enum(['discover', 'matches', 'messages', 'profile', 'dtm']);
const tid = z.string().min(1).max(64);
const matchId = z.string().min(1).max(64);

export const SafetyBlockSchema = z.object({
  tid,
  surface: surface.optional(),
});

export const SafetyReportSchema = z.object({
  tid,
  surface: surface.optional(),
  reason: z.enum(['spam', 'inappropriate', 'fake', 'underage', 'harassment', 'other']),
});

export const DiscoverUnmatchSchema = z.object({
  matchId,
  tid: tid.optional(),
  surface: surface.optional(),
});

export const MatchHoldSchema = z.object({
  matchId,
  tid: tid.optional(),
});

export const MatchUnholdSchema = z.object({
  matchId,
  tid: tid.optional(),
});

export const DtmQuestionSkipSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
});

export const DtmAnswerReviseSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
  // Old/new values are coerced to strings on the client; we don't need
  // their internal scale here, just that the user changed their mind.
  fromValue: z.union([z.string().max(64), z.number()]).optional(),
  toValue: z.union([z.string().max(64), z.number()]).optional(),
});

// ─── v6.6: see-later pile + batch-exhausted + skipped review ────────────────
export const DiscoverSeeLaterSchema = z.object({
  tid,
  // The 10-card batch the deferred profile came from (for analytics).
  batchId: z.string().min(1).max(64).optional(),
  // Free-form reason from optional UI ("not now", "thinking", ...).
  reason: z.enum(['not_now', 'thinking', 'unsure', 'other']).optional(),
});

export const DiscoverSeeLaterViewSchema = z.object({
  tid,
  // Time elapsed between defer and view, in ms (client computed).
  ageMs: positiveMs.optional(),
});

export const DiscoverBatchExhaustedSchema = z.object({
  batchId: z.string().min(1).max(64),
  shown: z.number().int().nonnegative(),
  acted: z.number().int().nonnegative(),
  deferred: z.number().int().nonnegative(),
  durationMs: positiveMs.optional(),
});

export const DiscoverSkippedOpenSchema = z.object({
  pileSize: z.number().int().nonnegative(),
});

export const DiscoverSkippedActionSchema = z.object({
  tid,
  // The action the user finally took on the previously-skipped profile.
  action: z.enum(['like', 'pass', 'super_like', 'see_later']),
});

export const DtmSeeLaterSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
});

export const DtmSeeLaterViewSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
  ageMs: positiveMs.optional(),
});

export const DtmBatchExhaustedSchema = z.object({
  topic: z.string().min(1).max(64),
  shown: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  deferred: z.number().int().nonnegative(),
  durationMs: positiveMs.optional(),
});

// ─── v7: payload schemas for pre-v6 events that emit but lacked validation ──
// Adding these closes the boundary-validation gap without renaming the map.
export const DiscoverSwipeSchema = z.object({
  tid: tid.optional(),
  dir: z.enum(['left', 'right', 'super', 'up', 'down']),
  velocity: z.number().min(-10000).max(10000).optional(),
  distance: z.number().min(0).max(10000).optional(),
  hesitationMs: positiveMs.optional(),
  source: z.enum(['gesture', 'button', 'keyboard']).optional(),
});

export const SwipeCommitSchema = z.object({
  tid: tid.optional(),
  dir: z.enum(['left', 'right', 'super', 'up', 'down']),
  velocity: z.number().min(-10000).max(10000).optional(),
  hesitationMs: positiveMs.optional(),
});

export const SwipeUndoSchema = z.object({
  tid: tid.optional(),
  withinMs: positiveMs.optional(),
});

export const SwipeRegretSchema = z.object({
  tid: tid.optional(),
  withinMs: positiveMs,
  originalDir: z.enum(['left', 'right', 'super', 'up', 'down']),
});

export const SwipeRepeatPassSchema = z.object({
  tid,
  count: z.number().int().min(2).max(50),
});

export const CardImpressionSchema = z.object({
  tid,
  ratio: z.number().min(0).max(1).optional(),
  pos: z.number().int().min(0).max(1000).optional(),
  surface: surface.optional(),
});

export const CardImpression100Schema = CardImpressionSchema.extend({
  dwellMs: positiveMs,
});

export const CardHoverSchema = z.object({
  tid,
  dwellMs: positiveMs,
  surface: surface.optional(),
});

export const CardBioExpandSchema = z.object({
  tid,
  surface: surface.optional(),
});

export const CardBioCollapseSchema = z.object({
  tid,
  dwellMs: positiveMs,
  surface: surface.optional(),
});

export const CardPhotoSwipeSchema = z.object({
  tid,
  fromIndex: z.number().int().nonnegative(),
  toIndex: z.number().int().nonnegative(),
});

export const DtmAnswerSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
  // Numeric scale answers map to a normalised 0..1; categorical to short string.
  value: z.union([z.number().min(0).max(1), z.string().max(64)]),
  responseMs: positiveMs.optional(),
});

export const DtmQuestionViewSchema = z.object({
  topic: z.string().min(1).max(64),
  qid: z.string().min(1).max(128),
});

export const DtmCompleteSchema = z.object({
  topic: z.string().min(1).max(64),
  total: z.number().int().positive(),
  durationMs: positiveMs.optional(),
});

export const MsgSendSchema = z.object({
  threadId: z.string().min(1).max(128),
  kind: z.enum(['text', 'voice', 'photo', 'gif', 'sticker', 'beat', 'move']),
  firstMove: z.boolean().optional(),
  charLen: z.number().int().nonnegative().max(10000).optional(),
  voiceMs: positiveMs.optional(),
});

export const MsgReadSchema = z.object({
  threadId: z.string().min(1).max(128),
  msgId: z.string().min(1).max(128).optional(),
});

export const MsgReactionSchema = z.object({
  threadId: z.string().min(1).max(128),
  msgId: z.string().min(1).max(128).optional(),
  emoji: z.string().min(1).max(8),
});

export const NotificationShownSchema = z.object({
  notifId: z.string().min(1).max(128),
  channel: z.enum(['push', 'inapp', 'email']).optional(),
  kind: z.string().min(1).max(64).optional(),
});

export const NotificationOpenedSchema = NotificationShownSchema;

export const NotificationDismissedSchema = z.object({
  notifId: z.string().min(1).max(128),
  withinMs: positiveMs.optional(),
});

export const SearchQuerySchema = z.object({
  // No raw query text — only stats. Length / token count is enough signal.
  qLen: z.number().int().nonnegative().max(512),
  tokens: z.number().int().nonnegative().max(64).optional(),
  filtersActive: z.number().int().nonnegative().max(64).optional(),
});

export const SearchResultClickSchema = z.object({
  pos: z.number().int().nonnegative().max(1000),
  tid: tid.optional(),
});

export const SearchNoResultsSchema = z.object({
  qLen: z.number().int().nonnegative().max(512),
});

// ─── v8 (v3.6.0): intent/mood/polarity/depth + exposure + move + voice +
// family-brief + chat-deposit + dtm topic-masking ────────────────────────
// All event payloads are `strict()` — unknown keys fail validation rather
// than being silently stripped, because these events drive downstream
// rankers and we want any client-side schema drift to surface fast.

const IntentClassEnum = z.enum([
  'distraction_browse',
  'intentional_browse',
  'reply_mood',
  'review_existing',
  'serious_search',
  'casual_scroll',
  'decision_fatigued',
]);

const ttlMs = z.number().int().min(0).max(600_000);   // 0..10 min — TTL for inference snapshots.
const uidHash = z.string().min(20).max(24);           // 22-char base64url HMAC, with ±2 slack.

export const IntentSnapshotSchema = z.object({
  intentClass: IntentClassEnum,
  confidence: z.number().min(0).max(1),
  ttlMs,
}).strict();

export const EngagementDepthScoredSchema = z.object({
  tid,
  depth: z.number().min(0).max(1),
  surface: surface.optional(),
  accidentalClick: z.boolean().optional(),
}).strict();

export const MoodInferredSchema = z.object({
  rage: z.number().min(0).max(1),
  calm: z.number().min(0).max(1),
  curious: z.number().min(0).max(1),
  receptive: z.number().min(0).max(1),
  fatigued: z.number().min(0).max(1),
  ttlMs,
}).strict();

export const PolarityComputedSchema = z.object({
  tid,
  polarity: z.number().min(-1).max(1),   // -1=hate-scroll, +1=positive-interest
  dwellMs: positiveMs.optional(),
}).strict();

export const ExposureCreditEarnedSchema = z.object({
  surface,
  reason: z.string().min(1).max(64),
  slots: z.number().int().min(1).max(50),
}).strict();

export const ExposureSlotFilledSchema = z.object({
  surface,
  targetHash: uidHash,
  slotType: z.enum(['organic', 'fairness_inject', 'top10', 'premium_boost']),
}).strict();

export const MoveComposedSchema = z.object({
  receiverHash: uidHash,
  suggestionCount: z.number().int().min(0).max(5),
  fallbackCount: z.number().int().min(0).max(5),
  hookCategories: z.array(z.string().max(32)).max(5),
  languageFamily: z.enum(['en', 'hi_en', 'ta_en', 'bn_en']),
}).strict();

export const MoveSuggestionAcceptedSchema = z.object({
  receiverHash: uidHash,
  slotIndex: z.number().int().min(0).max(4),
  hookCategory: z.string().max(32),
  tone: z.enum(['reflective', 'casual', 'tactile', 'quick']),
}).strict();

export const VoiceFingerprintShownSchema = z.object({
  messageCount: z.number().int().min(0).max(100_000),
}).strict();

export const VoiceFingerprintSharedSchema = z.object({
  channel: z.enum(['instagram', 'whatsapp', 'copy_link', 'other']),
}).strict();

export const FamilyBriefGeneratedSchema = z.object({
  format: z.enum(['pdf', 'image', 'text']),
  hasTrackViews: z.boolean(),
}).strict();

// Privacy: no IP, no UA — token is the only correlator.
export const FamilyBriefViewedSchema = z.object({
  token: z.string().min(20).max(24),
}).strict();

export const ChatDepositMadeSchema = z.object({
  receiverHash: uidHash,
  minutesDeposited: z.number().int().min(1).max(2),
}).strict();

export const ChatReplyBonusPaidSchema = z.object({
  senderHash: uidHash,
  minutesAwarded: z.number().int().min(1).max(2),
  replyMs: positiveMs,
}).strict();

export const ChatGhostBurnSchema = z.object({
  receiverHash: uidHash,
  minutesBurned: z.number().int().min(1).max(2),
}).strict();

export const DtmTopicMaskedSchema = z.object({
  topic: z.string().min(1).max(64),
  reason: z.enum(['low_mood', 'window_shopping_streak', 'coverage_sparse']),
}).strict();

// v3.6.1 — fired by the web client when MatchSuccessModal opens with v2 suggestions.
// Receiver tracked via HMAC-hashed id (22 char base64url); source distinguishes
// the discover surface from the (future) DTM surface; suggestionCount capped at 5
// to match the v2 composer contract.
export const MatchMoveV2ModalShownSchema = z.object({
  receiverHash: z.string().min(20).max(24),
  source: z.enum(['discover', 'dtm']),
  suggestionCount: z.number().int().min(0).max(5),
}).strict();

export const V6_VALIDATORS = {
  'attention.idle.enter':    AttentionIdleEnterSchema,
  'attention.idle.exit':     AttentionIdleExitSchema,
  'nav.route':               NavRouteSchema,
  'focus.element':           FocusElementSchema,
  'intent.dwell':            IntentDwellSchema,
  'session.summary':         SessionSummarySchema,
  'profile.self_view_dwell': ProfileSelfViewDwellSchema,
  'filter.hesitation':       FilterHesitationSchema,
  'msg.voice_rerecord':      MsgVoiceRerecordSchema,
  'notif.look_no_act':       NotifLookNoActSchema,
  'dtm.partial_abandon':     DtmPartialAbandonSchema,
  // v6.5
  'safety.block':            SafetyBlockSchema,
  'safety.report':           SafetyReportSchema,
  'discover.unmatch':        DiscoverUnmatchSchema,
  'match.hold':              MatchHoldSchema,
  'match.unhold':            MatchUnholdSchema,
  'dtm.question_skip':       DtmQuestionSkipSchema,
  'dtm.answer_revise':       DtmAnswerReviseSchema,
  // v6.6
  'discover.see_later':         DiscoverSeeLaterSchema,
  'discover.see_later.view':    DiscoverSeeLaterViewSchema,
  'discover.batch.exhausted':   DiscoverBatchExhaustedSchema,
  'discover.skipped.open':      DiscoverSkippedOpenSchema,
  'discover.skipped.action':    DiscoverSkippedActionSchema,
  'dtm.see_later':              DtmSeeLaterSchema,
  'dtm.see_later.view':         DtmSeeLaterViewSchema,
  'dtm.batch.exhausted':        DtmBatchExhaustedSchema,
  // v7: pre-v6 event payload validation
  'discover.swipe':             DiscoverSwipeSchema,
  'swipe.commit':               SwipeCommitSchema,
  'swipe.undo':                 SwipeUndoSchema,
  'swipe.regret':               SwipeRegretSchema,
  'swipe.repeat_pass':          SwipeRepeatPassSchema,
  'card.impression.50':         CardImpressionSchema,
  'card.impression.100':        CardImpression100Schema,
  'card.hover':                 CardHoverSchema,
  'card.bio.expand':            CardBioExpandSchema,
  'card.bio.collapse':          CardBioCollapseSchema,
  'card.photo.swipe':           CardPhotoSwipeSchema,
  'dtm.answer':                 DtmAnswerSchema,
  'dtm.question_view':          DtmQuestionViewSchema,
  'dtm.complete':               DtmCompleteSchema,
  'msg.send':                   MsgSendSchema,
  'msg.read':                   MsgReadSchema,
  'msg.reaction':               MsgReactionSchema,
  'notification.shown':         NotificationShownSchema,
  'notification.opened':        NotificationOpenedSchema,
  'notification.dismissed':     NotificationDismissedSchema,
  'search.query':               SearchQuerySchema,
  'search.result_click':        SearchResultClickSchema,
  'search.no_results':          SearchNoResultsSchema,
  // v8 (v3.6.0): intent/mood/polarity/depth + exposure + move + voice +
  // family-brief + chat-deposit + dtm topic-masking
  'intent.snapshot':             IntentSnapshotSchema,
  'engagement.depth_scored':     EngagementDepthScoredSchema,
  'mood.inferred':               MoodInferredSchema,
  'polarity.computed':           PolarityComputedSchema,
  'exposure.credit_earned':      ExposureCreditEarnedSchema,
  'exposure.slot_filled':        ExposureSlotFilledSchema,
  'move.composed':               MoveComposedSchema,
  'move.suggestion_accepted':    MoveSuggestionAcceptedSchema,
  'voice_fingerprint.shown':     VoiceFingerprintShownSchema,
  'voice_fingerprint.shared':    VoiceFingerprintSharedSchema,
  'family_brief.generated':      FamilyBriefGeneratedSchema,
  'family_brief.viewed':         FamilyBriefViewedSchema,
  'chat.deposit_made':           ChatDepositMadeSchema,
  'chat.reply_bonus_paid':       ChatReplyBonusPaidSchema,
  'chat.ghost_burn':             ChatGhostBurnSchema,
  'dtm.topic_masked':            DtmTopicMaskedSchema,
  'match.move_v2_modal_shown':   MatchMoveV2ModalShownSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export type V6EventName = keyof typeof V6_VALIDATORS;

export function isV6Event(name: string): name is V6EventName {
  return name in V6_VALIDATORS;
}

export type ValidationResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function validateV6Payload(
  name: TrackEventName | string,
  payload: unknown,
): ValidationResult {
  if (!isV6Event(name)) return { ok: false, error: `not a v6 event: ${name}` };
  const schema = V6_VALIDATORS[name];
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
  }
  return { ok: true, data: result.data };
}
