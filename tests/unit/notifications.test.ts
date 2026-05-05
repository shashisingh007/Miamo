// ─── Notifications Service Unit Tests ────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app, prisma } from '../../../services/notifications/src/server';

const headers = (userId: string) => ({
  'x-user-id': userId,
  'x-internal-key': 'test-internal-key',
});

let userId: string;
let notificationId: string;

beforeAll(async () => {
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true } });
  if (!user) throw new Error('No seeded users found');
  userId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Notifications Service', () => {
  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('notifications');
    });
  });

  describe('GET /ready', () => {
    it('returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  describe('POST /internal/notifications', () => {
    it('creates notification via internal endpoint', async () => {
      const res = await request(app)
        .post('/internal/notifications')
        .set({ 'x-internal-key': 'test-internal-key' })
        .send({ userId, type: 'system', title: 'Test Notification', body: 'Created by unit test' });
      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('system');
      notificationId = res.body.data.id;
    });

    it('rejects without internal key', async () => {
      const res = await request(app)
        .post('/internal/notifications')
        .send({ userId, type: 'system', title: 'Test', body: 'Should fail' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('returns notifications list', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects without auth', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/count', () => {
    it('returns unread count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/count')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(typeof res.body.data.count).toBe('number');
    });
  });

  describe('POST /api/v1/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      if (!notificationId) return;
      const res = await request(app)
        .post(`/api/v1/notifications/${notificationId}/read`)
        .set(headers(userId));
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set(headers(userId));
      expect(res.status).toBe(200);
    });
  });
});
