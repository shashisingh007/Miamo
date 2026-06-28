/**
 * Autotrack: scans the DOM for `[data-track]` / `[data-track-section]` /
 * `[data-track-impression]` elements and wires impressions + clicks
 * automatically. Authors instrument by adding attributes; no JS required.
 *
 * Attribute conventions:
 *   data-track="cta_join"          → click event with this name
 *   data-track-section="hero"      → impression event when section enters viewport
 *   data-track-impression="card_x" → impression event for atomic targets
 *   data-track-tt="user"           → optional target type
 *   data-track-tid="abc"           → optional target id
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string; d?: number }) => void;

const SEEN = new WeakSet<Element>();
const VIS_RATIO = 0.5;

export function installAutotrack(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (typeof IntersectionObserver === 'undefined') return () => undefined;

  const visTimes = new WeakMap<Element, number>();

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const name =
          el.dataset.trackSection ||
          el.dataset.trackImpression ||
          el.dataset.track ||
          'anon';
        if (entry.isIntersecting && entry.intersectionRatio >= VIS_RATIO) {
          if (!visTimes.has(el)) visTimes.set(el, performance.now());
          if (!SEEN.has(el)) {
            SEEN.add(el);
            emit({
              e: 'impression',
              p: { name, w: Math.round(el.getBoundingClientRect().width) },
              tid: el.dataset.trackTid,
              tt: el.dataset.trackTt,
            });
          }
        } else if (visTimes.has(el)) {
          const start = visTimes.get(el) || performance.now();
          const dwell = Math.round(performance.now() - start);
          visTimes.delete(el);
          if (dwell > 250) {
            emit({
              e: 'dwell',
              p: { name },
              tid: el.dataset.trackTid,
              tt: el.dataset.trackTt,
              d: dwell,
            });
          }
        }
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  const observeAll = (): void => {
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-track-section],[data-track-impression]',
    );
    nodes.forEach((n) => {
      if (!SEEN.has(n)) io.observe(n);
    });
  };

  const onClick = (ev: MouseEvent): void => {
    const path = ev.composedPath ? ev.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      const name = node.dataset.track;
      if (name) {
        emit({
          e: 'click',
          p: { name, autotrack: true },
          tid: node.dataset.trackTid,
          tt: node.dataset.trackTt,
        });
        return;
      }
    }
  };

  const mo = new MutationObserver(() => observeAll());
  if (document.body) {
    observeAll();
    mo.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('click', onClick, { passive: true, capture: true });

  // re-scan on route change
  window.addEventListener('mio:routechange', (() => {
    observeAll();
  }) as EventListener);

  return () => {
    io.disconnect();
    mo.disconnect();
    document.removeEventListener('click', onClick, true);
  };
}
