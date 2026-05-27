/**
 * Swipe decision telemetry — v4 addition.
 *
 * Emits a structured trail for every swipe in the Discover stack so the
 * algorithms can read:
 *   - hesitation: ms between card visible and swipe commit
 *   - regret:     undo within REGRET_MS of commit
 *   - repeat-pass: same target shown ≥2x in session and passed each time
 *
 * Wired from the Discover swipe component (not auto-DOM): the component
 * calls `swipeTracker.onCardVisible(id)`, `onSwipeStart(dir)`,
 * `onSwipeCommit(dir, velocity)`, `onSwipeAbort(dir)`, `onUndo()`.
 *
 * No raw coordinates kept; only velocity (px/s) bucketed to nearest 50.
 */

import { track } from '../index';

const REGRET_MS = 3_000;
const SESSION_PASS_MEM: Map<string, number> = new Map();

let currentCardId: string | null = null;
let currentCardVisibleAt = 0;
let lastCommit: { id: string; dir: 'left' | 'right' | 'up'; at: number } | null = null;

export const swipeTracker = {
  onCardVisible(targetId: string): void {
    currentCardId = targetId;
    currentCardVisibleAt = performance.now();
    const seen = SESSION_PASS_MEM.get(targetId) || 0;
    if (seen >= 2) track('swipe.repeat_pass', { count: seen });
  },

  onSwipeStart(dir: 'left' | 'right' | 'up'): void {
    track('swipe.start', { dir });
  },

  onSwipeAbort(dir: 'left' | 'right' | 'up'): void {
    const ms = Math.round(performance.now() - currentCardVisibleAt);
    track('swipe.abort', { dir, ms });
  },

  onSwipeCommit(dir: 'left' | 'right' | 'up', velocityPxPerSec: number, distance: number): void {
    if (!currentCardId) return;
    const now = performance.now();
    const hesitationMs = Math.round(now - currentCardVisibleAt);
    const velocity = Math.round(velocityPxPerSec / 50) * 50;
    track('swipe.commit', {
      dir, velocity, distance: Math.round(distance), hesitationMs,
    });
    lastCommit = { id: currentCardId, dir, at: now };
    if (dir === 'left') {
      SESSION_PASS_MEM.set(currentCardId, (SESSION_PASS_MEM.get(currentCardId) || 0) + 1);
    } else {
      SESSION_PASS_MEM.delete(currentCardId);
    }
  },

  onUndo(): void {
    if (!lastCommit) return;
    const ms = Math.round(performance.now() - lastCommit.at);
    track('swipe.undo', { prevDir: lastCommit.dir, ms });
    if (ms <= REGRET_MS) {
      track('swipe.regret', { prevDir: lastCommit.dir, ms });
    }
    if (lastCommit.dir === 'left') {
      SESSION_PASS_MEM.set(lastCommit.id, Math.max(0, (SESSION_PASS_MEM.get(lastCommit.id) || 1) - 1));
    }
    lastCommit = null;
  },

  /** Clear in-memory pass log; for tests + session boundaries. */
  _reset(): void {
    SESSION_PASS_MEM.clear();
    currentCardId = null;
    currentCardVisibleAt = 0;
    lastCommit = null;
  },
};
