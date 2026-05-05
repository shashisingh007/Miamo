// ─── Content Service Unit Tests ──────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app, prisma } from '../../../services/content/src/server';

const headers = (userId: string) => ({
  'x-user-id': userId,
  'x-internal-key': 'test-internal-key',
});

let userId: string;
let postId: string;
let storyId: string;

beforeAll(async () => {
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true } });
  if (!user) throw new Error('No seeded users found');
  userId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Content Service', () => {
  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('content');
    });
  });

  describe('GET /ready', () => {
    it('returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  // ─── Feed ──────────────────────────────────────────
  describe('Feed', () => {
    it('GET /api/v1/feed returns posts', async () => {
      const res = await request(app)
        .get('/api/v1/feed')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/feed creates a post', async () => {
      const res = await request(app)
        .post('/api/v1/feed')
        .set(headers(userId))
        .send({ content: 'Unit test post', type: 'thought' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Unit test post');
      postId = res.body.data.id;
    });

    it('PUT /api/v1/feed/:id updates a post', async () => {
      if (!postId) return;
      const res = await request(app)
        .put(`/api/v1/feed/${postId}`)
        .set(headers(userId))
        .send({ content: 'Updated unit test post' });
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/feed/:id/react reacts to post', async () => {
      if (!postId) return;
      const res = await request(app)
        .post(`/api/v1/feed/${postId}/react`)
        .set(headers(userId))
        .send({ type: '❤️' });
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/feed/:id/comments adds comment', async () => {
      if (!postId) return;
      const res = await request(app)
        .post(`/api/v1/feed/${postId}/comments`)
        .set(headers(userId))
        .send({ content: 'Great post!' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/feed/:id/comments returns comments', async () => {
      if (!postId) return;
      const res = await request(app)
        .get(`/api/v1/feed/${postId}/comments`)
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('DELETE /api/v1/feed/:id deletes post', async () => {
      if (!postId) return;
      const res = await request(app)
        .delete(`/api/v1/feed/${postId}`)
        .set(headers(userId));
      expect(res.status).toBe(200);
    });

    it('rejects feed without auth', async () => {
      const res = await request(app).get('/api/v1/feed');
      expect(res.status).toBe(401);
    });
  });

  // ─── Stories ───────────────────────────────────────
  describe('Stories', () => {
    it('GET /api/v1/stories returns stories', async () => {
      const res = await request(app)
        .get('/api/v1/stories')
        .set(headers(userId));
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/stories creates story', async () => {
      const res = await request(app)
        .post('/api/v1/stories')
        .set(headers(userId))
        .send({ type: 'text', content: 'Test story ✨' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Test story ✨');
      storyId = res.body.data.id;
    });

    it('POST /api/v1/stories/:id/view records view', async () => {
      if (!storyId) return;
      const res = await request(app)
        .post(`/api/v1/stories/${storyId}/view`)
        .set(headers(userId));
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/stories/:id/viewers returns viewers', async () => {
      if (!storyId) return;
      const res = await request(app)
        .get(`/api/v1/stories/${storyId}/viewers`)
        .set(headers(userId));
      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/stories/:id deletes story', async () => {
      if (!storyId) return;
      const res = await request(app)
        .delete(`/api/v1/stories/${storyId}`)
        .set(headers(userId));
      expect(res.status).toBe(200);
    });
  });

  // ─── Creativity ────────────────────────────────────
  describe('Creativity', () => {
    it('GET /api/v1/creativity/categories', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/categories')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/creativity/items', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/items')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/creativity/trends', async () => {
      const res = await request(app)
        .get('/api/v1/creativity/trends')
        .set(headers(userId));
      expect(res.status).toBe(200);
    });
  });

  // ─── Videos ────────────────────────────────────────
  describe('Videos', () => {
    it('GET /api/v1/videos returns videos', async () => {
      const res = await request(app)
        .get('/api/v1/videos')
        .set(headers(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/videos creates video post', async () => {
      const res = await request(app)
        .post('/api/v1/videos')
        .set(headers(userId))
        .send({ url: 'https://example.com/test.mp4', caption: 'Test video' });
      expect(res.status).toBe(200);
    });
  });
});
