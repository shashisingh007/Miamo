/**
 * Batcher — drains the queue on a timer, on visibility=hidden, on pagehide,
 * and on hard caps (count or byte size). Uses sendBeacon when available so
 * events survive page unload; falls back to fetch with keepalive.
 *
 * Failures are silent — tracking must never break a user's session.
 */
import { MAX_ENVELOPE_BYTES, MAX_EVENTS_PER_BATCH, type TrackEvent } from '../types';
import { buildEnvelope } from '../envelope';
import { EventQueue } from './queue';

export type BatcherOptions = {
  endpoint: string;
  /** ms between scheduled flushes */
  intervalMs: number;
  /** flush when queue reaches this many events */
  maxBatch: number;
  /** byte cap per request */
  maxBytes: number;
  /** scopes to attach to the envelope */
  getScopes: () => string[];
  /** allow the caller to abort all sends (kill switch / consent revoked) */
  isEnabled: () => boolean;
  /** optional transport override for tests */
  sender?: (url: string, body: string) => boolean | Promise<boolean>;
};

export class Batcher {
  private queue = new EventQueue(512);
  private timer: ReturnType<typeof setInterval> | null = null;
  private mounted = false;
  private inFlight = false;

  constructor(private opts: BatcherOptions) {}

  mount(): void {
    if (this.mounted || typeof window === 'undefined') return;
    this.mounted = true;
    this.timer = setInterval(() => this.flush('interval'), this.opts.intervalMs);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('beforeunload', this.onPageHide);
  }

  unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('pagehide', this.onPageHide);
      window.removeEventListener('beforeunload', this.onPageHide);
    }
  }

  enqueue(evt: TrackEvent): void {
    if (!this.opts.isEnabled()) return;
    this.queue.push(evt);
    if (this.queue.size >= this.opts.maxBatch) this.flush('count');
  }

  flush(_reason: string): boolean {
    if (!this.opts.isEnabled() || this.inFlight) return false;
    if (this.queue.size === 0) return false;
    const evts = this.queue.drain(this.opts.maxBatch);
    const envelope = buildEnvelope(evts, this.opts.getScopes());
    const body = JSON.stringify(envelope);
    if (body.length > this.opts.maxBytes && evts.length > 1) {
      // Halve and retry — recursive trims will resolve oversize cases.
      const mid = Math.ceil(evts.length / 2);
      // re-queue the tail in front of any new events
      for (let i = evts.length - 1; i >= mid; i--) this.queue.push(evts[i]);
      const trimmedEnv = buildEnvelope(evts.slice(0, mid), this.opts.getScopes());
      return this.send(JSON.stringify(trimmedEnv));
    }
    return this.send(body);
  }

  private send(body: string): boolean {
    this.inFlight = true;
    const ok = (this.opts.sender || defaultSender)(this.opts.endpoint, body);
    // sender returns sync bool (beacon) or Promise (fetch fallback).
    if (typeof (ok as Promise<boolean>).then === 'function') {
      (ok as Promise<boolean>).finally(() => {
        this.inFlight = false;
      });
      return true;
    }
    this.inFlight = false;
    return ok as boolean;
  }

  private onVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.flush('hidden');
    }
  };
  private onPageHide = (): void => {
    this.flush('pagehide');
  };
}

function defaultSender(url: string, body: string): boolean | Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return true;
    }
  } catch {
    // fall through to fetch
  }
  if (typeof fetch === 'function') {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: body.length < 60 * 1024,
      credentials: 'omit',
    })
      .then((r) => r.ok)
      .catch(() => false);
  }
  return false;
}

export const _internals = { MAX_ENVELOPE_BYTES, MAX_EVENTS_PER_BATCH };
