/**
 * Cursor / click collector.
 *
 * Captures:
 *  - throttled cursor sample (16 Hz max) — heatmap source
 *  - click events with simple selector + dwell-since-page-view
 *  - rage click (3+ clicks within 800 ms in a 40 px radius)
 *  - dead click (click on element with no listener and no navigation within 200 ms)
 *
 * No keystrokes ever captured. Selectors are coarse: tagName + #id +
 * .first-class + [data-track]. No text content, no form field values.
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string }) => void;

const SAMPLE_MS = 60; // ~16 Hz
const RAGE_WINDOW_MS = 800;
const RAGE_RADIUS = 40;
const RAGE_COUNT = 3;
const DEAD_DELAY_MS = 200;

export function installCursor(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let lastSample = 0;
  const recentClicks: Array<{ x: number; y: number; t: number }> = [];
  let pageStart = performance.now();

  const onMove = (ev: MouseEvent): void => {
    const now = performance.now();
    if (now - lastSample < SAMPLE_MS) return;
    lastSample = now;
    emit({
      e: 'cursor.sample',
      p: {
        x: Math.round((ev.clientX / window.innerWidth) * 1000) / 10,
        y: Math.round((ev.clientY / window.innerHeight) * 1000) / 10,
      },
    });
  };

  const targetSelector = (el: Element | null): string => {
    if (!el) return '';
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 1).join('.')
      : '';
    const data = (el as HTMLElement).dataset?.track ? `[data-track=${(el as HTMLElement).dataset.track}]` : '';
    return `${tag}${id}${cls}${data}`.slice(0, 96);
  };

  const onClick = (ev: MouseEvent): void => {
    const target = ev.target as Element | null;
    const sel = targetSelector(target);
    const now = performance.now();
    const dwell = Math.round(now - pageStart);
    emit({
      e: 'click',
      p: { sel, x: Math.round(ev.clientX), y: Math.round(ev.clientY), dwellMs: dwell },
    });

    // rage detection
    recentClicks.push({ x: ev.clientX, y: ev.clientY, t: now });
    while (recentClicks.length && now - recentClicks[0].t > RAGE_WINDOW_MS) recentClicks.shift();
    const nearby = recentClicks.filter(
      (c) => Math.hypot(c.x - ev.clientX, c.y - ev.clientY) <= RAGE_RADIUS,
    );
    if (nearby.length >= RAGE_COUNT) {
      emit({ e: 'click.rage', p: { sel, count: nearby.length } });
      recentClicks.length = 0;
    }

    // dead click: no nav + no DOM change shortly after
    const beforeUrl = location.href;
    const beforeBodyLen = document.body?.innerHTML.length || 0;
    setTimeout(() => {
      const navChanged = location.href !== beforeUrl;
      const domDelta = Math.abs((document.body?.innerHTML.length || 0) - beforeBodyLen);
      if (!navChanged && domDelta < 4) {
        emit({ e: 'click.dead', p: { sel } });
      }
    }, DEAD_DELAY_MS);
  };

  const onRouteResetForPage = (): void => {
    pageStart = performance.now();
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('click', onClick, { passive: true, capture: true });
  window.addEventListener('mio:routechange', onRouteResetForPage as EventListener);

  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('mio:routechange', onRouteResetForPage as EventListener);
  };
}
