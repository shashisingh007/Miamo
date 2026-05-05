// ─── Integration Tests: Social + Content + Messaging ─
// Tests cross-service flows using shared database
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app as socialApp, prisma as socialPrisma } from '../../../services/social/src/server';
import { app as contentApp } from '../../../services/content/src/server';
import { app as messagingApp } from '../../../services/messaging/src/server';
import { app as notifApp, prisma as notifPrisma } from '../../../services/notifications/src/server';

const headers = (userId: string) => ({
  'x-user-id': userId,
  'x-internal-key': 'test-internal-key',
});

let user1Id: string;
let user2Id: string;

beforeAll(async () => {
  const users = await socialPrisma.user.findMany({
    where: { active: true },
    select: { id: true },
    take: 2,
  });
  if (users.length < 2) throw new Error('Need at least 2 seeded users');
  user1Id = users[0].id;
  user2Id = users[1].id;
});

afterAll(async () => {
  await socialPrisma.$disconnect();
  await notifPrisma.$disconnect();
});

describe('Social → Content → Messaging Integration', () => {
  // ─── Discovery + Matching Flow ─────────────────────
  describe('Discovery → Match → Chat', () => {
    it('User1 discovers profiles', async () => {
      const res = await request(socialApp)
        .get('/api/v1/discover')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('User1 gets AI match suggestions', async () => {
      const res = await request(socialApp)
        .get('/api/v1/ai-match/suggestions')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('User1 checks AI match score with User2', async () => {
      const res = await request(socialApp)
        .get(`/api/v1/ai-match/score/${user2Id}`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(res.body.data.aiScore).toBeDefined();
      expect(typeof res.body.data.aiScore).toBe('number');
    });

    it('User1 views matches list', async () => {
      const res = await request(socialApp)
        .get('/api/v1/matches')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Content Creation Flow ─────────────────────────
  describe('Content Creation Flow', () => {
    let postId: string;

    it('User1 creates a feed post', async () => {
      const res = await request(contentApp)
        .post('/api/v1/feed')
        .set(headers(user1Id))
        .send({ content: 'Integration test post 🚀', type: 'thought' });
      expect(res.status).toBe(200);
      postId = res.body.data.id;
    });

    it('User2 reacts to User1 post', async () => {
      if (!postId) return;
      const res = await request(contentApp)
        .post(`/api/v1/feed/${postId}/react`)
        .set(headers(user2Id))
        .send({ type: '❤️' });
      expect(res.status).toBe(200);
    });

    it('User2 comments on User1 post', async () => {
      if (!postId) return;
      const res = await request(contentApp)
        .post(`/api/v1/feed/${postId}/comments`)
        .set(headers(user2Id))
        .send({ content: 'Love this!' });
      expect(res.status).toBe(200);
    });

    it('User1 sees comments on their post', async () => {
      if (!postId) return;
      const res = await request(contentApp)
        .get(`/api/v1/feed/${postId}/comments`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('User1 creates a story', async () => {
      const res = await request(contentApp)
        .post('/api/v1/stories')
        .set(headers(user1Id))
        .send({ type: 'text', content: 'Integration story ✨' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Integration story ✨');
    });

    it('Cleanup: delete the test post', async () => {
      if (!postId) return;
      const res = await request(contentApp)
        .delete(`/api/v1/feed/${postId}`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
    });
  });

  // ─── Messaging Flow ────────────────────────────────
  describe('Messaging Flow', () => {
    it('User1 views chat list', async () => {
      const res = await request(messagingApp)
        .get('/api/v1/messages/chats')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('User1 views beats', async () => {
      const res = await request(messagingApp)
        .get('/api/v1/beats')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Notifications Flow ────────────────────────────
  describe('Internal Notification + Read', () => {
    let notifId: string;

    it('Creates notification via internal endpoint', async () => {
      const res = await request(notifApp)
        .post('/internal/notifications')
        .set({ 'x-internal-key': 'test-internal-key' })
        .send({ userId: user1Id, type: 'match', title: 'New Match!', body: 'You matched with someone' });
      expect(res.status).toBe(200);
      notifId = res.body.data.id;
    });

    it('User1 sees notification count', async () => {
      const res = await request(notifApp)
        .get('/api/v1/notifications/count')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeGreaterThan(0);
    });

    it('User1 reads the notification', async () => {
      if (!notifId) return;
      const res = await request(notifApp)
        .post(`/api/v1/notifications/${notifId}/read`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
    });
  });

  // ─── Safety Flow ───────────────────────────────────
  describe('Safety Flow', () => {
    it('User1 views safety tips', async () => {
      const res = await request(socialApp)
        .get('/api/v1/safety/tips')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── All Services Health Check ─────────────────────
  describe('All Services Health', () => {
    it('Social service is healthy', async () => {
      const res = await request(socialApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.db).toBe('connected');
    });

    it('Content service is healthy', async () => {
      const res = await request(contentApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.db).toBe('connected');
    });

    it('Messaging service is healthy', async () => {
      const res = await request(messagingApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.db).toBe('connected');
    });

    it('Notifications service is healthy', async () => {
      const res = await request(notifApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.db).toBe('connected');
    });
  });
});
