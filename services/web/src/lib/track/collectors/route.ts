/**
 * Route + page-view collector (Next.js App Router compatible).
 *
 * Watches the History API and emits `route.change` + `page.view` for both
 * initial mount and SPA navigations. Dispatches a window event `mio:routechange`
 * so other collectors (dwell/scroll/cursor) can reset per-page state.
 */
import { safePath } from '../device';

type Emit = (event: { e: string; p?: Record<string, unknown>; d?: number }) => void;

export function installRoute(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let lastPath = safePath();
  let lastTs = performance.now();

  const fire = (from: string, to: string): void => {
    const now = performance.now();
    const dwell = Math.round(now - lastTs);
    emit({ e: 'page.leave', p: { from }, d: dwell });
    emit({ e: 'route.change', p: { from, to } });
    emit({ e: 'page.view', p: { path: to } });
    window.dispatchEvent(new CustomEvent('mio:routechange', { detail: { from, to } }));
    lastPath = to;
    lastTs = now;
  };

  // Initial page view
  emit({ e: 'page.view', p: { path: lastPath } });

  const onPop = (): void => {
    const to = safePath();
    if (to !== lastPath) fire(lastPath, to);
  };

  // Wrap pushState / replaceState so SPA navigations fire too.
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState = function patched(this: History, ...args: Parameters<History['pushState']>) {
    const ret = origPush(...args);
    queueMicrotask(() => {
      const to = safePath();
      if (to !== lastPath) fire(lastPath, to);
    });
    return ret;
  };
  history.replaceState = function patched(this: History, ...args: Parameters<History['replaceState']>) {
    const ret = origReplace(...args);
    queueMicrotask(() => {
      const to = safePath();
      if (to !== lastPath) fire(lastPath, to);
    });
    return ret;
  };

  window.addEventListener('popstate', onPop);

  return () => {
    window.removeEventListener('popstate', onPop);
    history.pushState = origPush;
    history.replaceState = origReplace;
  };
}
