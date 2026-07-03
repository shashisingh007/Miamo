/**
 * Shared moderation types.
 *
 * Every moderation client (image, text, video-later) speaks the same
 * `ModerationDecision` shape so downstream call-sites can treat them
 * uniformly. Categories are a fixed enum — do not add ad-hoc strings.
 */

// Fixed category enum. If you add one, you must also:
//   1. Update the union type below
//   2. Update severity + policy mappings in imageModerationClient + textModerationClient
//   3. Update `docs/architecture/moderation-pipeline.md`
export type ModerationCategory =
  | 'nudity'
  | 'violence'
  | 'drugs'
  | 'weapons'
  | 'hate_symbols'
  | 'csam'
  | 'spam'
  | 'slur'
  | 'doxxing'
  | 'other';

export const MODERATION_CATEGORIES: readonly ModerationCategory[] = [
  'nudity',
  'violence',
  'drugs',
  'weapons',
  'hate_symbols',
  'csam',
  'spam',
  'slur',
  'doxxing',
  'other',
] as const;

/**
 * The decision returned by every moderation call.
 *
 *   approved   — safe to publish. If false, `categories` explains why.
 *   categories — 0-many categories that fired. Empty array for approved.
 *   confidence — best-effort 0..1 confidence for the strongest fired
 *                category. Approved calls report 0.
 *   severity   — 'soft' (block from public view, let user re-edit) or
 *                'hard' (audit-log + delete; do not surface). CSAM is
 *                always hard; slur can be soft or hard depending on
 *                keyword tier.
 *   reason     — human-readable string for logs + admin UI.
 */
export interface ModerationDecision {
  approved: boolean;
  categories: ModerationCategory[];
  confidence: number;
  severity: 'none' | 'soft' | 'hard';
  reason: string;
}

/**
 * A moderator client. `moderateImage` accepts a URL (upload storage
 * URL) and `moderateText` accepts the raw string. Both must be safe
 * to call from a request-scope: pass-through timeouts, no unbounded
 * external I/O. Real cloud implementations (AWS Rekognition, Perspective
 * API) must wrap their SDK calls with a hard timeout and fall back to
 * `approved: true` when the timeout fires — a moderation-service outage
 * must not block content upload.
 */
export interface ImageModerator {
  moderateImage(url: string): Promise<ModerationDecision>;
}

export interface TextModerator {
  moderateText(text: string): Promise<ModerationDecision>;
}

// Helper: an "approved" decision. Reused by every client.
export const APPROVED: ModerationDecision = {
  approved: true,
  categories: [],
  confidence: 0,
  severity: 'none',
  reason: 'ok',
};

// Helper: build a rejection decision.
export function reject(
  categories: ModerationCategory[],
  confidence: number,
  severity: 'soft' | 'hard',
  reason: string,
): ModerationDecision {
  return {
    approved: false,
    categories: [...new Set(categories)],
    confidence: Math.max(0, Math.min(1, confidence)),
    severity,
    reason,
  };
}
