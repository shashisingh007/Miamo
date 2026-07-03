/**
 * Visibility + session lifecycle collector.
 *
 * Emits `session.start` once per visit, `visibility.change` on focus/blur,
 * a low-frequency `session.heartbeat` while the tab is visible, and a
 * `session.end` on pagehide. End duration is the cumulative *visible* time.
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; d?: number }) => void;

const HEARTBEAT_MS = 30_000;

export function installVisibility(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const start = performance.now();
  let lastVisibleAt = start;
  let cumulativeVisible = 0;
  let visible = document.visibilityState === 'visible';

  emit({ e: 'session.start', p: { vis: visible ? 'visible' : 'hidden' } });

  const hb = setInterval(() => {
    if (document.visibilityState === 'visible') {
      emit({ e: 'session.heartbeat', d: HEARTBEAT_MS });
    }
  }, HEARTBEAT_MS);

  const onVis = (): void => {
    const now = performance.now();
    const nowVisible = document.visibilityState === 'visible';
    if (visible && !nowVisible) {
      cumulativeVisible += now - lastVisibleAt;
    }
    if (!visible && nowVisible) {
      lastVisibleAt = now;
    }
    visible = nowVisible;
    emit({ e: 'visibility.change', p: { state: document.visibilityState } });
  };

  const onEnd = (): void => {
    const now = performance.now();
    if (visible) cumulativeVisible += now - lastVisibleAt;
    emit({ e: 'session.end', d: Math.round(cumulativeVisible) });
  };

  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', onEnd, { once: true });

  return () => {
    clearInterval(hb);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onEnd);
  };
}
