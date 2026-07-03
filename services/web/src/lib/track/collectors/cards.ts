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
    let inFull = false;
    let enteredFullAt = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // 50% threshold — entry only.
          if (e.intersectionRatio >= 0.5 && !fired50) {
            fired50 = true;
            track('card.impression.50', { tid: targetId });
          }
          // Track full-visibility entry/exit so we can attach a dwell duration
          // to `card.impression.100`. Emitted ON EXIT with `d: dwellMs` so the
          // worker's PercentileEstimator naturally builds a dwellHistogram.
          if (e.intersectionRatio >= 0.99 && !inFull) {
            inFull = true;
            enteredFullAt = performance.now();
            // settle detection: same target re-entering full view within RETURN_MS
            const wall = Date.now();
            const prev = lastSeenAt.get(targetId);
            if (prev && wall - prev <= RETURN_MS && !settleEmitted.has(targetId)) {
              settleEmitted.add(targetId);
              track('intent.profile.settle', { tid: targetId, gapMs: wall - prev });
            }
            lastSeenAt.set(targetId, wall);
          }
          if (e.intersectionRatio < 0.5 && inFull) {
            inFull = false;
            const dwellMs = Math.round(performance.now() - enteredFullAt);
            track('card.impression.100', { tid: targetId, d: dwellMs });
          }
        }
      },
      { threshold: [0.5, 0.99] },
    );
    io.observe(el);
    return () => {
      // On unmount, if still in full view, flush the in-progress dwell so it
      // is not silently lost.
      if (inFull) {
        const dwellMs = Math.round(performance.now() - enteredFullAt);
        track('card.impression.100', { tid: targetId, d: dwellMs });
      }
      io.disconnect();
    };
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
