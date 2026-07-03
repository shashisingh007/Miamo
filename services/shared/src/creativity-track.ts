// ─── Creativity Action Tracker ─────────────────────────
// Centralized adapter so EVERY user-facing action in the Creativity feature
// gets persisted to UserActivity (for the learning loop) with consistent
// action names + metadata shape. The existing UserActivityAnalyzer reads
// `targetType: 'creativity'` and `meta.category`/`engageAction`, so we mirror
// that vocabulary here and let learning happen for free.
//
// Fire-and-forget by design: tracking failures must NEVER block the action.
// trackActivity() in audit.ts already swallows errors; we add a thin wrapper
// per event type so call sites stay one-liner.

import type { PrismaClient } from '@prisma/client';
import { trackActivity } from './audit';

export type CreativityAction =
  // Author actions
  | 'creativity.upload'
  | 'creativity.delete'
  | 'creativity.expire'             // server-emitted on auto-burn
  | 'creativity.almost_trending'    // server nudge to creator at 40 beats
  // Trend lifecycle
  | 'creativity.trend.queued'
  | 'creativity.trend.start'
  | 'creativity.trend.end'
  | 'creativity.trend.extended'
  // Viewer engagement — both prefixed (server-canonical) and bare names are
  // accepted because the analyzer keys on `targetType: 'creativity'` + the
  // verb after the dot (or the bare verb). Bare verbs come from the
  // `content_engage` mirror row this module also writes.
  | 'view' | 'creativity.view'
  | 'like' | 'creativity.like'
  | 'unlike' | 'creativity.unlike'
  | 'comment' | 'creativity.comment'
  | 'save' | 'creativity.save'
  | 'unsave' | 'creativity.unsave'
  | 'share' | 'creativity.share'
  | 'move' | 'creativity.move'
  | 'pass' | 'creativity.pass'
  // Earnings
  | 'spotlight.granted'
  | 'spotlight.spent'
  | 'spotlight.refunded'
  | 'spotlight.purchased';

export interface CreativityMeta {
  category?: string;
  subTag?: string;
  mediaType?: 'text' | 'image' | 'video';
  minutesPaid?: number;
  beatCount?: number;
  saveCount?: number;
  moveCount?: number;
  authorId?: string;
  trending?: boolean;
  queuePosition?: number;
  // Engagement-action subtype the analyzer already understands.
  // share=4, comment=3, like=2, default=1 — see activity-analyzer.ts.
  engageAction?: 'share' | 'comment' | 'like' | 'view' | 'beat' | 'save' | 'move';
  // Earning context
  reason?: string;
  delta?: number;
  // Free-form extras
  [k: string]: unknown;
}

/**
 * Record a creativity action to UserActivity (for behavioral learning) and
 * — when the action is engagement-flavored — also write a 'content_engage'
 * row that feeds the analyzer's category-preference path.
 *
 * Returns immediately; persistence happens fire-and-forget.
 */
export function recordCreativityAction(
  prisma: PrismaClient,
  userId: string,
  action: CreativityAction,
  itemId: string | null,
  meta: CreativityMeta = {},
  durationMs?: number,
): void {
  // Primary row — analyzer reads this for view/like/dwell/category signals.
  trackActivity(prisma, userId, action, 'creativity', itemId ?? undefined, meta, durationMs);

  // For engagement-flavored actions, ALSO emit the canonical content_engage
  // row that activity-analyzer.buildPreferenceVector() reads for
  // contentCategories. We map our verb to engageAction so weights apply:
  //   share=4, comment=3, move=4 (treat as share-tier), like/beat=2,
  //   save=2, view=1, pass=skip (no boost).
  const engageMap: Partial<Record<CreativityAction, CreativityMeta['engageAction']>> = {
    view: 'view',                'creativity.view': 'view',
    like: 'like',                'creativity.like': 'like',
    comment: 'comment',          'creativity.comment': 'comment',
    save: 'save',                'creativity.save': 'save',
    share: 'share',              'creativity.share': 'share',
    move: 'share',               'creativity.move': 'share',
  };
  const engage = engageMap[action];
  if (engage && meta.category) {
    trackActivity(prisma, userId, 'content_engage', 'creativity', itemId ?? undefined, {
      ...meta,
      engageAction: engage,
    }, durationMs);
  }
}

/**
 * High-signal creator-trait propagation: when a viewer Beats/Moves/Saves
 * a post, persist the *creator's* traits as a profile-target activity row
 * so Discover ranking learns the viewer is drawn to creators with those
 * traits. Action is normalized to a verb that activity-analyzer's
 * buildPreferenceVector() already grants weight to:
 *   move  → 'super_like' (strongest profile signal: "I want to date them")
 *   like  → 'like'        (a Beat is a positive vote)
 *   save  → 'like'        (quieter vote; we still tag it)
 */
export function propagateCreatorTraits(
  prisma: PrismaClient,
  viewerId: string,
  authorId: string,
  postId: string,
  action: 'like' | 'move' | 'save',
  creatorTraits: { city?: string; intent?: string; age?: number; interests?: string[] },
): void {
  if (viewerId === authorId) return;  // never self-train
  const profileVerb = action === 'move' ? 'super_like' : 'like';
  trackActivity(prisma, viewerId, profileVerb, 'profile', authorId, {
    ...creatorTraits,
    via: 'creativity',
    sourceAction: action,
    fromPostId: postId,
  });
}
