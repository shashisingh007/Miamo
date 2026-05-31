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
