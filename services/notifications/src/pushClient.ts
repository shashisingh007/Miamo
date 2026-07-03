// ─── Web Push abstraction (G.16 notifications infra) ────────────────
//
// Purpose: keep the notifications service decoupled from the specific
// push transport (web-push VAPID today, potentially APNS/FCM later).
//
// Feature flag: WEB_PUSH_ENABLED=1 activates the real VAPID pusher. When
// unset (default), createPushClient() returns a LocalStubPusher that
// only logs — safe for dev + tests, never a runtime crash.
//
// This file deliberately does NOT import the `web-push` npm package —
// no new npm dependencies (per session brief). The WebPushProducer
// class is a stub whose `send()` throws a clear runtime error until the
// founder wires a real transport. This gives us type-safe wiring today
// without adding surface area.

/**
 * Result of a single push attempt.
 * `delivered` is optimistic (fire-and-forget) — the transport typically
 * returns 201 without waiting for the client to receive. `error` captures
 * a categorised failure so callers can log/metric it.
 */
export interface PushResult {
  delivered: boolean;
  error?: 'no-subscription' | 'transport-disabled' | 'transport-error';
  transport: 'stub' | 'webpush';
}

/** Payload delivered to the browser. Kept small — browsers cap ~4KB. */
export interface PushPayload {
  title: string;
  body: string;
  /** Optional url the notification's click will focus. */
  url?: string;
  /** Optional key so a re-notification collapses on the same slot. */
  tag?: string;
  /** Arbitrary sub-4KB JSON blob echoed to the SW `push` event. */
  data?: Record<string, unknown>;
}

/** Everything a transport needs about a single subscription. */
export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushClient {
  /** Send one push. Never throws — callers get PushResult with `.error`. */
  send(sub: PushSubscriptionRecord | null | undefined, payload: PushPayload): Promise<PushResult>;
  /** For observability / tests. Which transport is bound? */
  readonly name: 'stub' | 'webpush';
}

/**
 * Dev / test transport. Logs to console with a `[push-stub]` prefix and
 * returns `{ delivered: true, transport: 'stub' }`. Never crashes.
 */
export class LocalStubPusher implements PushClient {
  readonly name = 'stub' as const;
  async send(sub: PushSubscriptionRecord | null | undefined, payload: PushPayload): Promise<PushResult> {
    if (!sub || !sub.endpoint) return { delivered: false, error: 'no-subscription', transport: 'stub' };
    // eslint-disable-next-line no-console
    console.log('[push-stub]', { endpoint: sub.endpoint.slice(0, 40), title: payload.title, tag: payload.tag });
    return { delivered: true, transport: 'stub' };
  }
}

/**
 * Real Web Push VAPID transport — **stubbed** until the `web-push` package
 * is added. Rejects any send until:
 *   1. `WEB_PUSH_ENABLED=1`
 *   2. `WEB_PUSH_VAPID_PUBLIC` + `WEB_PUSH_VAPID_PRIVATE` env are set
 *   3. `WEB_PUSH_SUBJECT` env is set (mailto:/https:// per RFC 8292)
 *
 * When those are set, `send()` still throws today with a clear message —
 * the launch team wires the `web-push` package + a `webpush.sendNotification`
 * call. This keeps the type surface + factory branching solid today so
 * the wiring is a one-file change tomorrow.
 */
export class WebPushProducer implements PushClient {
  readonly name = 'webpush' as const;

  constructor(private readonly cfg: {
    vapidPublic: string;
    vapidPrivate: string;
    subject: string;
  }) {
    if (!cfg.vapidPublic || !cfg.vapidPrivate || !cfg.subject) {
      throw new Error('WebPushProducer: VAPID keys + subject required');
    }
  }

  async send(_sub: PushSubscriptionRecord | null | undefined, _payload: PushPayload): Promise<PushResult> {
    // When wiring the real package:
    //   const webpush = require('web-push');
    //   webpush.setVapidDetails(this.cfg.subject, this.cfg.vapidPublic, this.cfg.vapidPrivate);
    //   const result = await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 });
    //   return { delivered: result.statusCode < 300, transport: 'webpush' };
    return { delivered: false, error: 'transport-disabled', transport: 'webpush' };
  }
}

/**
 * Factory — inspects env and returns the right client. Never throws
 * from missing env; the LocalStubPusher is always a safe fallback.
 */
export function createPushClient(env: NodeJS.ProcessEnv = process.env): PushClient {
  if (env.WEB_PUSH_ENABLED !== '1') return new LocalStubPusher();
  const vapidPublic = env.WEB_PUSH_VAPID_PUBLIC;
  const vapidPrivate = env.WEB_PUSH_VAPID_PRIVATE;
  const subject = env.WEB_PUSH_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !subject) return new LocalStubPusher();
  return new WebPushProducer({ vapidPublic, vapidPrivate, subject });
}
