// ─── Social Service Unit Tests ───────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app, prisma } from '../../../services/social/src/server';

const headers = (userId: string) => ({
  'x-user-id': userId,
  'x-internal-key': 'test-internal-key',
});

let user1Id: string;
let user2Id: string;

beforeAll(async () => {
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true }, take: 2 });
  if (users.length < 2) throw new Error('Need at least 2 seeded users');
  user1Id = users[0].id;
  user2Id = users[1].id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Social Service', () => {
  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('social');
    });
  });

  describe('GET /ready', () => {
    it('returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  // ─── Discover ──────────────────────────────────────
  describe('GET /api/v1/discover', () => {
    it('returns discover profiles', async () => {
      const res = await request(app)
        .get('/api/v1/discover')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects without auth', async () => {
      const res = await request(app).get('/api/v1/discover');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/discover/comment', () => {
    it('creates a match request', async () => {
      // Clean any existing request first
      await prisma.matchRequest.deleteMany({ where: { fromUserId: user1Id, toUserId: user2Id } });

      const res = await request(app)
        .post('/api/v1/discover/comment')
        .set(headers(user1Id))
        .send({ toUserId: user2Id, message: 'Hey from unit test!', type: 'comment' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
    });
  });

  describe('POST /api/v1/discover/like', () => {
    it('creates a like request', async () => {
      // Clean first
      const user3 = await prisma.user.findFirst({ where: { active: true, id: { notIn: [user1Id, user2Id] } }, select: { id: true } });
      if (!user3) return; // skip if no 3rd user
      await prisma.matchRequest.deleteMany({ where: { fromUserId: user1Id, toUserId: user3.id } });

      const res = await request(app)
        .post('/api/v1/discover/like')
        .set(headers(user1Id))
        .send({ toUserId: user3.id, type: 'like' });
      expect(res.status).toBe(200);
    });
  });

  // ─── Matches ───────────────────────────────────────
  describe('GET /api/v1/matches', () => {
    it('returns matches list', async () => {
      const res = await request(app)
        .get('/api/v1/matches')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/matches/requests', () => {
    it('returns received requests', async () => {
      const res = await request(app)
        .get('/api/v1/matches/requests')
        .set(headers(user2Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/matches/requests/sent', () => {
    it('returns sent requests', async () => {
      const res = await request(app)
        .get('/api/v1/matches/requests/sent')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── AI Match ──────────────────────────────────────
  describe('GET /api/v1/ai-match/suggestions', () => {
    it('returns AI scored profiles', async () => {
      const res = await request(app)
        .get('/api/v1/ai-match/suggestions')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].aiScore).toBeDefined();
        expect(res.body.data[0].reasons).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/ai-match/score/:targetId', () => {
    it('returns score for specific user', async () => {
      const res = await request(app)
        .get(`/api/v1/ai-match/score/${user2Id}`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(res.body.data.aiScore).toBeDefined();
    });
  });

  // ─── Safety ────────────────────────────────────────
  describe('GET /api/v1/safety/tips', () => {
    it('returns safety tips', async () => {
      const res = await request(app)
        .get('/api/v1/safety/tips')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/safety/report', () => {
    it('creates a report', async () => {
      const res = await request(app)
        .post('/api/v1/safety/report')
        .set(headers(user1Id))
        .send({ reportedUserId: user2Id, reason: 'spam', description: 'Unit test report' });
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/safety/reports', () => {
    it('returns user reports', async () => {
      const res = await request(app)
        .get('/api/v1/safety/reports')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
