/**
 * Card-level interaction collector — v4 addition.
 *
 * Provides imperative helpers the Discover card component calls. Emits
 * fine-grained signals the v5 ranker reads (`attentionFit`, `returnRate`):
 *   - `card.impression.50` / `card.impression.100` via IntersectionObserver
 *   - `card.hover` with dwell (pointer enter→leave) on the card or its bio
 *   - `card.bio.expand` / `card.bio.collapse`
 *   - `card.photo.swipe` (within-card photo nav)
 *   - `intent.profile.settle` when the same target is returned to twice
 *     within the same session
 *
 * Pure event helpers; nothing is wired automatically (the card component
 * owns the lifecycle).
 */

import { track } from '../index';

const RETURN_MS = 30_000;

const lastSeenAt = new Map<string, number>();
const settleEmitted = new Set<string>();

export const cardTracker = {
  observeCard(el: HTMLElement, targetId: string): () => void {
    if (typeof IntersectionObserver === 'undefined') return () => undefined;
    let fired50 = false;
    let fired100 = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.5 && !fired50) {
            fired50 = true;
            track('card.impression.50', { tid: targetId });
          }
          if (e.intersectionRatio >= 0.99 && !fired100) {
            fired100 = true;
            track('card.impression.100', { tid: targetId });
            // settle detection
            const now = Date.now();
            const prev = lastSeenAt.get(targetId);
            if (prev && now - prev <= RETURN_MS && !settleEmitted.has(targetId)) {
              settleEmitted.add(targetId);
              track('intent.profile.settle', { tid: targetId, gapMs: now - prev });
            }
            lastSeenAt.set(targetId, now);
          }
        }
      },
      { threshold: [0.5, 0.99] },
    );
    io.observe(el);
    return () => io.disconnect();
  },

  onHover(targetId: string, ms: number): void {
    if (ms < 250) return;
    track('card.hover', { tid: targetId, ms: Math.round(ms) });
  },

  onBioExpand(targetId: string): void {
    track('card.bio.expand', { tid: targetId });
  },

  onBioCollapse(targetId: string, ms: number): void {
    track('card.bio.collapse', { tid: targetId, ms: Math.round(ms) });
  },

  onPhotoSwipe(targetId: string, from: number, to: number): void {
    track('card.photo.swipe', { tid: targetId, from, to });
  },

  _reset(): void {
    lastSeenAt.clear();
    settleEmitted.clear();
  },
};
