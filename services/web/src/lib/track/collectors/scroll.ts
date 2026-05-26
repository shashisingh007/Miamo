/**
 * Scroll depth + idle.
 *
 * Emits max depth reached as a fraction of scrollable height when the user
 * pauses scrolling for 250 ms, and on visibility=hidden. Idle is emitted when
 * the viewport remains still for 5 s after a scroll burst.
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; d?: number }) => void;

const SETTLE_MS = 250;
const IDLE_MS = 5000;

export function installScroll(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let maxDepth = 0;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let lastBurst = performance.now();

  const compute = (): number => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const depth = Math.min(1, (window.scrollY + window.innerHeight) / (scrollable + window.innerHeight));
    return Math.round(depth * 1000) / 1000;
  };

  const reportDepth = (): void => {
    if (maxDepth > 0) emit({ e: 'scroll.depth', p: { depth: maxDepth } });
  };

  const onScroll = (): void => {
    const d = compute();
    if (d > maxDepth) maxDepth = d;
    lastBurst = performance.now();
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(reportDepth, SETTLE_MS);
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      emit({ e: 'scroll.idle', p: { depth: maxDepth }, d: Math.round(performance.now() - lastBurst) });
    }, IDLE_MS);
  };

  const onHide = (): void => {
    if (document.visibilityState === 'hidden') reportDepth();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('mio:routechange', (() => {
    maxDepth = 0;
  }) as EventListener);

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onHide);
  };
}
