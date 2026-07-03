/**
 * Inactivity collector — captures the *silences* that other collectors miss.
 *
 * Emits:
 *  - `discover.refresh.empty` — user pulled-to-refresh but did not swipe
 *    a single card before refreshing again or leaving the surface.
 *  - `filter.reverted`        — quick-filter changed and switched back to
 *    the prior value within 8s (indecision signal).
 *  - `feed.bounce`            — entered a feed surface (discover/dtm) and
 *    left within 5s with zero swipe/click action.
 *  - `feed.return.fast`       — re-entered the same feed within 60s of
 *    leaving (rumination / boredom-loop signal).
 *  - `card.hover.no_action`   — mouse hovered a profile card for >1.5s
 *    then moved away without click/swipe (consideration-without-commit).
 *  - `session.abandon`        — tab hidden for >120s after <3 actions in
 *    the session (gave up).
 *
 * All events are passive — they fire from existing browser signals,
 * never block UI, and never read user content.
 */

type Emit = (e: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string; d?: number }) => void;

interface FeedTimer {
  surface: string;
  enteredAt: number;
  actionCount: number;
  refreshCount: number;
  lastLeftAt?: number;
}

const FEED_PATHS = ['/discover', '/matrimonial', '/serious-mode'];
const HOVER_THRESHOLD_MS = 1500;
const BOUNCE_THRESHOLD_MS = 5000;
const RETURN_FAST_MS = 60_000;
const FILTER_REVERT_MS = 8000;
const SESSION_ABANDON_MS = 120_000;

export function installInactivity(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => {};

  const state: {
    feed: FeedTimer | null;
    lastFeed: { surface: string; leftAt: number } | null;
    filterHistory: Array<{ surface: string; from: string; to: string; at: number }>;
    sessionActions: number;
    hover: { id: string; at: number } | null;
  } = {
    feed: null,
    lastFeed: null,
    filterHistory: [],
    sessionActions: 0,
    hover: null,
  };

  function inferSurface(path: string): string | null {
    for (const p of FEED_PATHS) if (path.startsWith(p)) return p;
    return null;
  }

  // ─── Feed bounce / return-after-leave ──────────────
  function onRouteChange(detail: { from?: string; to?: string }) {
    const now = Date.now();
    const fromSurface = detail.from ? inferSurface(detail.from) : null;
    const toSurface = detail.to ? inferSurface(detail.to) : null;

    // Leaving a feed
    if (state.feed && state.feed.surface === fromSurface) {
      const dwell = now - state.feed.enteredAt;
      // Bounce: <5s on feed with no actions
      if (dwell < BOUNCE_THRESHOLD_MS && state.feed.actionCount === 0) {
        emit({ e: 'feed.bounce', p: { surface: state.feed.surface, dwellMs: dwell, refreshCount: state.feed.refreshCount }, d: dwell });
      }
      // Empty refresh: refreshed but never swiped
      if (state.feed.refreshCount > 0 && state.feed.actionCount === 0) {
        emit({ e: 'discover.refresh.empty', p: { surface: state.feed.surface, refreshCount: state.feed.refreshCount, dwellMs: dwell } });
      }
      state.lastFeed = { surface: state.feed.surface, leftAt: now };
      state.feed = null;
    }

    // Entering a feed
    if (toSurface) {
      // Return-after-leave?
      if (state.lastFeed && state.lastFeed.surface === toSurface && (now - state.lastFeed.leftAt) <= RETURN_FAST_MS) {
        emit({ e: 'feed.return.fast', p: { surface: toSurface, gapMs: now - state.lastFeed.leftAt } });
      }
      state.feed = { surface: toSurface, enteredAt: now, actionCount: 0, refreshCount: 0 };
    }
  }

  function onFeedAction() {
    if (state.feed) state.feed.actionCount++;
    state.sessionActions++;
  }

  function onFeedRefresh() {
    if (state.feed) state.feed.refreshCount++;
  }

  // ─── Filter revert ─────────────────────────────────
  function onFilterChanged(detail: { surface?: string; from?: string; to?: string }) {
    const now = Date.now();
    const surface = detail.surface || 'discover';
    const from = String(detail.from || '');
    const to = String(detail.to || '');

    // Look for a recent change that was the inverse of this one
    const recent = state.filterHistory.filter(h => (now - h.at) <= FILTER_REVERT_MS && h.surface === surface);
    const inverse = recent.find(h => h.from === to && h.to === from);
    if (inverse) {
      emit({ e: 'filter.reverted', p: { surface, from: inverse.from, to: inverse.to, holdMs: now - inverse.at } });
    }
    state.filterHistory.push({ surface, from, to, at: now });
    if (state.filterHistory.length > 20) state.filterHistory.shift();
  }

  // ─── Hover-no-action ───────────────────────────────
  function onPointerEnter(ev: PointerEvent) {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    const card = t.closest('[data-mio-profile-id]') as HTMLElement | null;
    if (!card) return;
    const id = card.getAttribute('data-mio-profile-id') || '';
    if (!id) return;
    state.hover = { id, at: Date.now() };
  }
  function onPointerLeave() {
    if (!state.hover) return;
    const dur = Date.now() - state.hover.at;
    if (dur >= HOVER_THRESHOLD_MS) {
      emit({ e: 'card.hover.no_action', tid: state.hover.id, tt: 'profile', p: { dwellMs: dur }, d: dur });
    }
    state.hover = null;
  }
  function onClickOrSwipe() {
    state.hover = null;
    onFeedAction();
  }

  // ─── Session abandon ───────────────────────────────
  let hiddenAt: number | null = null;
  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAt) {
      const gap = Date.now() - hiddenAt;
      if (gap >= SESSION_ABANDON_MS && state.sessionActions < 3) {
        emit({ e: 'session.abandon', p: { hiddenMs: gap, sessionActions: state.sessionActions } });
      }
      hiddenAt = null;
    }
  }

  // ─── Wire listeners ────────────────────────────────
  const routeHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    onRouteChange(detail);
  };
  const filterHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    onFilterChanged(detail);
  };
  const refreshHandler = () => onFeedRefresh();

  window.addEventListener('mio:routechange', routeHandler);
  window.addEventListener('mio:filterchange', filterHandler);
  window.addEventListener('mio:feedrefresh', refreshHandler);
  document.addEventListener('pointerenter', onPointerEnter, true);
  document.addEventListener('pointerleave', onPointerLeave, true);
  document.addEventListener('click', onClickOrSwipe, true);
  document.addEventListener('touchend', onClickOrSwipe, true);
  document.addEventListener('visibilitychange', onVisibility);

  // Seed initial route
  if (typeof location !== 'undefined') {
    const surface = inferSurface(location.pathname);
    if (surface) state.feed = { surface, enteredAt: Date.now(), actionCount: 0, refreshCount: 0 };
  }

  return () => {
    window.removeEventListener('mio:routechange', routeHandler);
    window.removeEventListener('mio:filterchange', filterHandler);
    window.removeEventListener('mio:feedrefresh', refreshHandler);
    document.removeEventListener('pointerenter', onPointerEnter, true);
    document.removeEventListener('pointerleave', onPointerLeave, true);
    document.removeEventListener('click', onClickOrSwipe, true);
    document.removeEventListener('touchend', onClickOrSwipe, true);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
