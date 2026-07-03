/**
 * pushClient — G.16 unit tests.
 *
 * Locks in factory branching + stub behaviour so a future refactor of the
 * transport layer can't silently disable pushes or crash on a missing
 * VAPID key.
 */

import { describe, it, expect } from 'vitest';
import {
  LocalStubPusher,
  WebPushProducer,
  createPushClient,
  type PushSubscriptionRecord,
  type PushPayload,
} from '../../services/notifications/src/pushClient';

const goodSub: PushSubscriptionRecord = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BOgJ...', auth: 'x123' },
};
const payload: PushPayload = { title: 'It\'s a match', body: 'Say hi to Priya', tag: 'match-42' };

describe('LocalStubPusher', () => {
  it('reports transport name "stub"', () => {
    expect(new LocalStubPusher().name).toBe('stub');
  });

  it('returns delivered=true on a well-formed subscription', async () => {
    const r = await new LocalStubPusher().send(goodSub, payload);
    expect(r).toEqual({ delivered: true, transport: 'stub' });
  });

  it('returns no-subscription error when sub is null/undefined/malformed', async () => {
    const stub = new LocalStubPusher();
    expect(await stub.send(null, payload)).toEqual({ delivered: false, error: 'no-subscription', transport: 'stub' });
    expect(await stub.send(undefined, payload)).toEqual({ delivered: false, error: 'no-subscription', transport: 'stub' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await stub.send({ endpoint: '', keys: {} as any }, payload)).toEqual({ delivered: false, error: 'no-subscription', transport: 'stub' });
  });
});

describe('WebPushProducer', () => {
  it('constructor throws when VAPID keys are missing', () => {
    expect(() => new WebPushProducer({ vapidPublic: '', vapidPrivate: 'x', subject: 'y' })).toThrow();
    expect(() => new WebPushProducer({ vapidPublic: 'x', vapidPrivate: '', subject: 'y' })).toThrow();
    expect(() => new WebPushProducer({ vapidPublic: 'x', vapidPrivate: 'y', subject: '' })).toThrow();
  });

  it('send() returns transport-disabled today (stubbed pending web-push package wiring)', async () => {
    const p = new WebPushProducer({ vapidPublic: 'a', vapidPrivate: 'b', subject: 'mailto:x@y' });
    const r = await p.send(goodSub, payload);
    expect(r.delivered).toBe(false);
    expect(r.transport).toBe('webpush');
    expect(r.error).toBe('transport-disabled');
  });
});

describe('createPushClient factory', () => {
  it('returns LocalStubPusher when WEB_PUSH_ENABLED != "1"', () => {
    const c = createPushClient({});
    expect(c.name).toBe('stub');
  });

  it('returns LocalStubPusher when WEB_PUSH_ENABLED=1 but VAPID env is incomplete', () => {
    const c = createPushClient({ WEB_PUSH_ENABLED: '1', WEB_PUSH_VAPID_PUBLIC: 'x' });
    expect(c.name).toBe('stub');
  });

  it('returns WebPushProducer when WEB_PUSH_ENABLED=1 and all three VAPID env vars are set', () => {
    const c = createPushClient({
      WEB_PUSH_ENABLED: '1',
      WEB_PUSH_VAPID_PUBLIC: 'a',
      WEB_PUSH_VAPID_PRIVATE: 'b',
      WEB_PUSH_SUBJECT: 'mailto:x@y',
    });
    expect(c.name).toBe('webpush');
  });
});
