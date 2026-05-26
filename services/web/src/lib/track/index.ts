/**
 * Public client SDK surface.
 *
 *   import { track, identify, setConsent, flush } from '@/lib/track';
 *
 * Nothing runs until `mount()` is called and the user grants consent.
 * The TrackProvider component handles both for the app.
 */
import { Batcher } from './transport/batcher';
import { installCursor } from './collectors/cursor';
import { installScroll } from './collectors/scroll';
import { installRoute } from './collectors/route';
import { installVisibility } from './collectors/visibility';
import { installErrors } from './collectors/errors';
import { installAutotrack } from './collectors/autotrack';
import { hasConsent, readConsent, writeConsent, type ConsentScope, type ConsentState } from './consent';
import { setUid } from './envelope';
import type { TrackEvent } from './types';

const ENDPOINT = process.env.NEXT_PUBLIC_TRACK_ENDPOINT || '/api/v1/track';

type State = {
  batcher: Batcher | null;
  ordinal: number;
  uninstallers: Array<() => void>;
  mounted: boolean;
};

const state: State = {
  batcher: null,
  ordinal: 0,
  uninstallers: [],
  mounted: false,
};

function activeScopes(): string[] {
  const c = readConsent();
  const scopes: ConsentScope[] = [];
  if (c.analytics) scopes.push('analytics');
  if (c.personalization) scopes.push('personalization');
  if (c.marketing) scopes.push('marketing');
  return scopes;
}

function isEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_TRACKING_ENABLED !== '1') return false;
  return hasConsent('analytics');
}

function emit(partial: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string; d?: number }): void {
  if (!state.batcher || !isEnabled()) return;
  const evt: TrackEvent = { ...partial, t: Date.now(), n: state.ordinal++ };
  state.batcher.enqueue(evt);
}

/** Public: emit a custom event from feature code. */
export function track(name: string, payload?: Record<string, unknown>): void {
  emit({ e: name, p: payload });
}

/** Public: associate the current device with a user id after login. */
export function identify(uid: string | undefined): void {
  setUid(uid);
}

/** Public: update consent (and rebuild collectors if needed). */
export function setConsent(next: Partial<ConsentState>): void {
  const prev = readConsent();
  writeConsent({ ...prev, ...next });
  // If consent flipped on/off, remount collectors accordingly.
  const enabledNow = hasConsent('analytics');
  if (enabledNow && !state.mounted) mount();
  if (!enabledNow && state.mounted) unmount();
}

/** Public: read current consent state. */
export function getConsent(): ConsentState {
  return readConsent();
}

/** Public: force-flush queued events (e.g. before a hard nav). */
export function flush(): void {
  state.batcher?.flush('manual');
}

/** Public: mount collectors and the batcher. Idempotent. */
export function mount(): void {
  if (state.mounted) return;
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_TRACKING_ENABLED !== '1') return;
  if (!hasConsent('analytics')) return;

  state.batcher = new Batcher({
    endpoint: ENDPOINT,
    intervalMs: 5_000,
    maxBatch: 30,
    maxBytes: 30 * 1024,
    getScopes: activeScopes,
    isEnabled,
  });
  state.batcher.mount();

  // Order matters: route first so other collectors see the initial path.
  state.uninstallers.push(installRoute(emit));
  state.uninstallers.push(installVisibility(emit));
  state.uninstallers.push(installScroll(emit));
  state.uninstallers.push(installCursor(emit));
  state.uninstallers.push(installAutotrack(emit));
  state.uninstallers.push(installErrors(emit));

  state.mounted = true;
}

/** Public: tear down collectors (consent revoked or app unmount). */
export function unmount(): void {
  if (!state.mounted) return;
  for (const off of state.uninstallers) {
    try { off(); } catch { /* ignore */ }
  }
  state.uninstallers = [];
  state.batcher?.flush('unmount');
  state.batcher?.unmount();
  state.batcher = null;
  state.mounted = false;
}

export type { ConsentScope, ConsentState } from './consent';
