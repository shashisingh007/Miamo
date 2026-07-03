/**
 * Attention / idle / away collector — v4 addition.
 *
 * Detects the "user is here but not interacting" states the algorithms need
 * to distinguish reading from absence. No keystrokes captured; only the
 * fact that input happened (mouse move, key, touch, scroll, focus).
 *
 *  - `attention.idle`           5s with no input on a visible page
 *  - `attention.away`          30s with no input on a visible page
 *  - `attention.return`        any input after an `away` state
 *  - `attention.long_heartbeat` "still here" ping at 2/5/10 min thresholds
 *
 * Privacy class: `quality` (always-on once analytics consent is granted).
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; d?: number }) => void;

const IDLE_MS = 5_000;
const AWAY_MS = 30_000;
const LONG_HEARTBEATS_MS = [120_000, 300_000, 600_000];
const CHECK_MS = 1_000;

export function installAttention(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let lastInputAt = performance.now();
  let pageEnteredAt = performance.now();
  let idleFired = false;
  let awayFired = false;
  const longHeartbeatsFired = new Set<number>();

  const onInput = (): void => {
    const now = performance.now();
    if (awayFired) {
      emit({ e: 'attention.return', p: { awayMs: Math.round(now - lastInputAt) } });
    }
    lastInputAt = now;
    idleFired = false;
    awayFired = false;
  };

  const onRouteReset = (): void => {
    pageEnteredAt = performance.now();
    longHeartbeatsFired.clear();
  };

  const inputEvents: Array<keyof WindowEventMap> = [
    'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'focus', 'wheel',
  ];
  for (const ev of inputEvents) {
    window.addEventListener(ev, onInput, { passive: true, capture: true });
  }
  window.addEventListener('mio:routechange', onRouteReset as EventListener);

  const tick = window.setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    const sinceInput = now - lastInputAt;
    const sincePage = now - pageEnteredAt;

    if (!idleFired && sinceInput >= IDLE_MS) {
      idleFired = true;
      emit({ e: 'attention.idle', p: { ms: Math.round(sinceInput) }, d: Math.round(sinceInput) });
    }
    if (!awayFired && sinceInput >= AWAY_MS) {
      awayFired = true;
      emit({ e: 'attention.away', p: { ms: Math.round(sinceInput) }, d: Math.round(sinceInput) });
    }
    for (const threshold of LONG_HEARTBEATS_MS) {
      if (sincePage >= threshold && !longHeartbeatsFired.has(threshold)) {
        longHeartbeatsFired.add(threshold);
        emit({ e: 'attention.long_heartbeat', p: { ms: threshold }, d: threshold });
      }
    }
  }, CHECK_MS);

  return () => {
    window.clearInterval(tick);
    for (const ev of inputEvents) {
      window.removeEventListener(ev, onInput, true);
    }
    window.removeEventListener('mio:routechange', onRouteReset as EventListener);
  };
}
