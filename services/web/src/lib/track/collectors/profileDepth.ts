// ─── Profile Depth Collector ───────────────────────────
// Measures HOW DEEP a user goes on a profile, not just whether they
// looked at it. Emits a single `profile.depth_score` per profile-leave
// containing photo count viewed, prompts opened, bio expanded, scroll
// depth, and total dwell.
//
// Detection: any element with [data-mio-profile-id="<userId>"] in the
// DOM is treated as the active profile container. When the user
// navigates away (route change) or the container is removed/scrolled
// out of view, we flush the score.
//
// Privacy: only counts and durations, no content.

type Emit = (e: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string; d?: number }) => void;

interface Active {
  pid: string;
  startedAt: number;
  photosViewed: Set<number>;
  promptsRead: Set<number>;
  bioExpanded: boolean;
  maxScrollDepth: number;
  longPress: boolean;
}

export function installProfileDepth(emit: Emit): () => void {
  let active: Active | null = null;

  const flush = (reason: string) => {
    if (!active) return;
    const dwell = Date.now() - active.startedAt;
    const depthScore =
      Math.min(40, active.photosViewed.size * 8) +
      Math.min(20, active.promptsRead.size * 5) +
      (active.bioExpanded ? 15 : 0) +
      Math.min(15, active.maxScrollDepth * 15) +
      (active.longPress ? 10 : 0);
    emit({
      e: 'profile.depth_score',
      tid: active.pid,
      d: dwell,
      p: {
        photos: active.photosViewed.size,
        prompts: active.promptsRead.size,
        bio: active.bioExpanded ? 1 : 0,
        scroll: Number(active.maxScrollDepth.toFixed(2)),
        longPress: active.longPress ? 1 : 0,
        score: depthScore,
        reason,
      },
    });
    if (dwell > 8000) emit({ e: 'card.dwell.long', tid: active.pid, d: dwell });
    else if (dwell < 2000) emit({ e: 'card.dwell.short', tid: active.pid, d: dwell });
    active = null;
  };

  const findProfileEl = (): { el: HTMLElement; pid: string } | null => {
    const el = document.querySelector<HTMLElement>('[data-mio-profile-id]');
    if (!el) return null;
    const pid = el.getAttribute('data-mio-profile-id');
    if (!pid) return null;
    return { el, pid };
  };

  const ensureActive = () => {
    const found = findProfileEl();
    if (!found) { flush('left'); return; }
    if (!active || active.pid !== found.pid) {
      flush('switch');
      active = {
        pid: found.pid, startedAt: Date.now(),
        photosViewed: new Set(), promptsRead: new Set(),
        bioExpanded: false, maxScrollDepth: 0, longPress: false,
      };
    }
  };

  const onClick = (ev: Event) => {
    if (!active) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    const photo = t.closest('[data-mio-photo-idx]');
    if (photo) {
      const idx = parseInt(photo.getAttribute('data-mio-photo-idx') || '-1', 10);
      if (idx >= 0) active.photosViewed.add(idx);
    }
    const prompt = t.closest('[data-mio-prompt-idx]');
    if (prompt) {
      const idx = parseInt(prompt.getAttribute('data-mio-prompt-idx') || '-1', 10);
      if (idx >= 0) active.promptsRead.add(idx);
    }
    if (t.closest('[data-mio-bio-toggle]')) active.bioExpanded = true;
  };

  const onScroll = () => {
    if (!active) return;
    const el = findProfileEl()?.el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const seen = Math.max(0, Math.min(r.height, vh - r.top));
    const ratio = seen / Math.max(1, r.height);
    if (ratio > active.maxScrollDepth) active.maxScrollDepth = ratio;
  };

  const onLongPress = () => { if (active) active.longPress = true; };

  // Run a tick on route change + every 1s to catch container changes.
  const tick = () => ensureActive();
  const intv = window.setInterval(tick, 1000);
  const onRouteChange = () => { flush('route'); ensureActive(); };
  const onPageHide = () => flush('pagehide');

  document.addEventListener('click', onClick, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('mio:routechange', onRouteChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('mio:gallery.long_press', onLongPress as EventListener);

  ensureActive();

  return () => {
    flush('unmount');
    window.clearInterval(intv);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('mio:routechange', onRouteChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('mio:gallery.long_press', onLongPress as EventListener);
  };
}
