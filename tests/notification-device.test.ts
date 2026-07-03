/**
 * NotificationDevice — mobile push registration tests.
 *
 * Introduced by the Expo mobile app. Exercises the new
 * POST /api/v1/notifications/register-device endpoint on the notifications
 * express app. Uses `vitest` + `app.callback()` style: we import the app
 * instance from services/notifications/src/server.ts, stub the prisma
 * client at module scope, and drive requests via node's `http` module
 * (matches the pattern used elsewhere in tests/).
 *
 * Covers:
 *   1. Valid registration — inserts the row.
 *   2. Duplicate token — upsert path, updates lastSeenAt without a 500.
 *   3. Auth required — 401 when the x-user-id header is missing.
 *   4. Bad platform — 400.
 *   5. Missing token — 400.
 *   6. Token length ceiling — 500-char body accepted, 501 rejected.
 *   7. Upsert refreshes lastSeenAt on repeat call.
 *   8. Revoked flag round-trip via update.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type express from 'express';
import type { AddressInfo } from 'net';

// Prime env before any code that reads it. The notifications service is
// gateway-authenticated: the shared `createInternalAuthMiddleware` requires
// BOTH a forwarded `x-user-id` AND a timing-safe-matched `x-internal-key`.
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32chars-long!';
process.env.TRACKING_HASH_SECRET = process.env.TRACKING_HASH_SECRET || 'test-tracking-hash-secret';

type UpsertArgs = {
  where: { token: string };
  create: { userId: string; platform: string; token: string };
  update: { userId: string; platform: string; lastSeenAt: Date; revoked: boolean };
};

interface DeviceRow {
  id: string;
  userId: string;
  platform: string;
  token: string;
  createdAt: Date;
  lastSeenAt: Date;
  revoked: boolean;
}

// In-memory store that stands in for prisma.notificationDevice.
const store = new Map<string, DeviceRow>();

vi.mock('../services/shared/src/service', async orig => {
  const actual = await orig<any>();
  return {
    ...actual,
    // Force the app to bind to a random port + skip Sentry side effects.
    createPrisma: () => ({
      $disconnect: async () => undefined,
      // The rest of the notifications app uses prisma.notification.*; we
      // only need the surfaces the register-device endpoint touches.
      notification: {
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
        update: async () => undefined,
        updateMany: async () => undefined,
        create: async () => ({ id: 'stub-notif' }),
      },
      notificationDevice: {
        upsert: async ({ where, create, update }: UpsertArgs) => {
          const existing = store.get(where.token);
          if (existing) {
            const updated: DeviceRow = {
              ...existing,
              userId: update.userId,
              platform: update.platform,
              lastSeenAt: update.lastSeenAt,
              revoked: update.revoked,
            };
            store.set(where.token, updated);
            return updated;
          }
          const row: DeviceRow = {
            id: `dev_${store.size + 1}`,
            userId: create.userId,
            platform: create.platform,
            token: create.token,
            createdAt: new Date(),
            lastSeenAt: new Date(),
            revoked: false,
          };
          store.set(where.token, row);
          return row;
        },
      },
    }),
    // No-op internal auth + push middleware: the auth middleware trusts the
    // gateway-forwarded x-user-id header. We keep the real implementation so
    // the "missing header" branch produces its real 401.
  };
});

// Now import the notifications express app. Because of the mock above, the
// module gets our stubbed prisma when it constructs its client at load time.
async function importApp(): Promise<express.Express> {
  const mod = await import('../services/notifications/src/server');
  return mod.app;
}

function post(
  app: express.Express,
  path: string,
  body: unknown,
  headers: Record<string, string>,
) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      const bodyStr = JSON.stringify(body);
      const req = require('http').request(
        {
          host: '127.0.0.1',
          port,
          method: 'POST',
          path,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
            ...headers,
          },
        },
        (res: any) => {
          let chunks = '';
          res.on('data', (c: Buffer) => (chunks += c.toString()));
          res.on('end', () => {
            server.close();
            let parsed: any = null;
            try {
              parsed = chunks ? JSON.parse(chunks) : null;
            } catch {
              parsed = chunks;
            }
            resolve({ status: res.statusCode, body: parsed });
          });
        },
      );
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  });
}

const USER = 'user_test_1';
const TOKEN = 'ExponentPushToken[abcdefghijklmno]';
const authHeaders = {
  'x-user-id': USER,
  'x-internal-key': process.env.INTERNAL_SERVICE_KEY!,
};

beforeEach(() => {
  store.clear();
});

describe('POST /api/v1/notifications/register-device', () => {
  it('accepts a valid registration and returns { ok: true }', async () => {
    const app = await importApp();
    const res = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'ios', token: TOKEN },
      authHeaders,
    );
    expect(res.status).toBe(200);
    expect(res.body?.data?.ok).toBe(true);
    expect(store.size).toBe(1);
    expect(store.get(TOKEN)?.platform).toBe('ios');
  });

  it('is idempotent on duplicate token — upsert path', async () => {
    const app = await importApp();
    // Prime the store as if we had registered once.
    await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, authHeaders);
    const before = store.get(TOKEN)!;
    await new Promise(r => setTimeout(r, 5));
    const second = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'ios', token: TOKEN },
      authHeaders,
    );
    expect(second.status).toBe(200);
    expect(store.size).toBe(1);
    const after = store.get(TOKEN)!;
    expect(after.lastSeenAt.getTime()).toBeGreaterThanOrEqual(before.lastSeenAt.getTime());
  });

  it('rejects request without x-user-id header (401)', async () => {
    const app = await importApp();
    const res = await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, {});
    expect(res.status).toBe(401);
  });

  it('rejects a bad platform (400)', async () => {
    const app = await importApp();
    const res = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'windows', token: TOKEN },
      authHeaders,
    );
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing token (400)', async () => {
    const app = await importApp();
    const res = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'ios' },
      authHeaders,
    );
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('accepts a 500-char token but rejects 501', async () => {
    const app = await importApp();
    const ok = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'ios', token: 'a'.repeat(500) },
      authHeaders,
    );
    expect(ok.status).toBe(200);
    const tooLong = await post(
      app,
      '/api/v1/notifications/register-device',
      { platform: 'ios', token: 'a'.repeat(501) },
      authHeaders,
    );
    expect(tooLong.status).toBe(400);
  });

  it('updates lastSeenAt on repeat registration', async () => {
    const app = await importApp();
    await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, authHeaders);
    const firstSeen = store.get(TOKEN)!.lastSeenAt.getTime();
    await new Promise(r => setTimeout(r, 15));
    await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, authHeaders);
    const secondSeen = store.get(TOKEN)!.lastSeenAt.getTime();
    expect(secondSeen).toBeGreaterThan(firstSeen);
  });

  it('resets revoked flag on re-registration (round-trip)', async () => {
    const app = await importApp();
    await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, authHeaders);
    // Simulate a background revoke (worker marks token dead).
    const row = store.get(TOKEN)!;
    store.set(TOKEN, { ...row, revoked: true });
    expect(store.get(TOKEN)!.revoked).toBe(true);
    // Fresh registration flips it back to false.
    await post(app, '/api/v1/notifications/register-device', { platform: 'ios', token: TOKEN }, authHeaders);
    expect(store.get(TOKEN)!.revoked).toBe(false);
  });
});
