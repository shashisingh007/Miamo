// ─── Miamo API Tests ─────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/server';

let token: string;
let userId: string;

describe('Miamo API', () => {
  beforeAll(async () => {
    // Clean up stale test data from previous runs
    const testUser = await prisma.user.findUnique({ where: { email: 'newuser@miamo.test' } });
    if (testUser) {
      await prisma.profile.deleteMany({ where: { userId: testUser.id } });
      await prisma.settings.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    // Reset miamo1 settings to default
    const miamo1 = await prisma.user.findUnique({ where: { email: 'miamo1@miamo.test' } });
    if (miamo1) {
      await prisma.settings.updateMany({ where: { userId: miamo1.id }, data: { theme: 'dark' } });
      // Clean up any existing likes/moves/match requests from miamo1 to allow fresh comment test
      await prisma.like.deleteMany({ where: { fromUserId: miamo1.id } });
      await prisma.miamoMove.deleteMany({ where: { fromUserId: miamo1.id } });
      await prisma.matchRequest.deleteMany({ where: { fromUserId: miamo1.id } });
    }
  });

  describe('Health', () => {
    it('GET /health returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/login with miamo1', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'miamo1@miamo.test', password: 'Miamo@12345' });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.username).toBe('miamo1');
      token = res.body.data.accessToken;
      userId = res.body.data.user.id;
    });

    it('POST /api/v1/auth/login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'miamo1@miamo.test', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/auth/me returns user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('miamo1@miamo.test');
    });

    it('POST /api/v1/auth/register creates user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'newuser@miamo.test', password: 'Test@12345', displayName: 'Test User' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.displayName).toBe('Test User');
    });
  });

  describe('Discover', () => {
    it('GET /api/v1/discover returns profiles', async () => {
      const res = await request(app)
        .get('/api/v1/discover')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/discover/comment creates match request', async () => {
      const discover = await request(app)
        .get('/api/v1/discover')
        .set('Authorization', `Bearer ${token}`);
      const targetUser = discover.body.data[0];

      const res = await request(app)
        .post('/api/v1/discover/comment')
        .set('Authorization', `Bearer ${token}`)
        .send({ toUserId: targetUser.id, message: 'Love your profile!', type: 'comment' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
    });
  });

  describe('Matches', () => {
    it('GET /api/v1/matches returns matches', async () => {
      const res = await request(app)
        .get('/api/v1/matches')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/matches/requests returns requests', async () => {
      const res = await request(app)
        .get('/api/v1/matches/requests')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Messages', () => {
    it('GET /api/v1/messages/chats returns chats', async () => {
      const res = await request(app)
        .get('/api/v1/messages/chats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Beats', () => {
    it('GET /api/v1/beats returns beats', async () => {
      const res = await request(app)
        .get('/api/v1/beats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Feed', () => {
    it('GET /api/v1/feed returns posts', async () => {
      const res = await request(app)
        .get('/api/v1/feed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/feed creates post', async () => {
      const res = await request(app)
        .post('/api/v1/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test post from miamo1', type: 'thought' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Test post from miamo1');
    });
  });

  describe('Stories', () => {
    it('GET /api/v1/stories returns stories', async () => {
      const res = await request(app)
        .get('/api/v1/stories')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/stories creates story', async () => {
      const res = await request(app)
        .post('/api/v1/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'text', content: 'Test story ✨' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Test story ✨');
    });
  });

  describe('Creativity', () => {
    it('GET /api/v1/creativity/categories', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/creativity/items', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/items')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/creativity/trends', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Search', () => {
    it('GET /api/v1/search?q=miamo', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=miamo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('respects privacy — user 20 not in results (search disabled)', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=miamo20')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      // user 20 has search disabled
      const found = res.body.data.find((u: any) => u.username === 'miamo20');
      expect(found).toBeUndefined();
    });
  });

  describe('AI Match', () => {
    it('GET /api/v1/ai-match/suggestions returns scored profiles', async () => {
      const res = await request(app)
        .get('/api/v1/ai-match/suggestions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].aiScore).toBeDefined();
      expect(res.body.data[0].reasons).toBeDefined();
    });
  });

  describe('Settings', () => {
    it('GET /api/v1/settings returns settings', async () => {
      const res = await request(app)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.settings.theme).toBe('dark');
    });

    it('PUT /api/v1/settings updates theme', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'lavender' });
      expect(res.status).toBe(200);
      expect(res.body.data.theme).toBe('lavender');
    });
  });

  describe('Notifications', () => {
    it('GET /api/v1/notifications returns notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Safety', () => {
    it('GET /api/v1/safety/tips returns tips', async () => {
      const res = await request(app)
        .get('/api/v1/safety/tips')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
