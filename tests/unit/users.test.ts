// ─── Users Service Unit Tests ────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app, prisma } from '../../../services/users/src/server';

const INTERNAL_HEADERS = {
  'x-user-id': '', // set in beforeAll
  'x-internal-key': 'test-internal-key',
};

let testUserId: string;

beforeAll(async () => {
  // Find first active user from seed data
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true } });
  if (!user) throw new Error('No seeded users found — run db:seed first');
  testUserId = user.id;
  INTERNAL_HEADERS['x-user-id'] = testUserId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Users Service', () => {
  describe('GET /health', () => {
    it('returns 200 with service info', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('users');
      expect(res.body.db).toBe('connected');
    });
  });

  describe('GET /ready', () => {
    it('returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  describe('GET /api/v1/users', () => {
    it('returns list of users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Should not expose passwordHash
      const first = res.body.data[0];
      expect(first.passwordHash).toBeUndefined();
    });

    it('rejects without auth headers', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns specific user', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/profiles/me', () => {
    it('returns current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/me')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body.data.profile).toBeDefined();
    });
  });

  describe('PUT /api/v1/profiles/me', () => {
    it('updates bio', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/me')
        .set(INTERNAL_HEADERS)
        .send({ bio: 'Updated via unit test' });
      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Updated via unit test');
    });

    it('updates city and profession', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/me')
        .set(INTERNAL_HEADERS)
        .send({ city: 'Test City', profession: 'Tester' });
      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('Test City');
      expect(res.body.data.profession).toBe('Tester');
    });
  });

  describe('GET /api/v1/settings', () => {
    it('returns user settings', async () => {
      const res = await request(app)
        .get('/api/v1/settings')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body.data.settings).toBeDefined();
      expect(res.body.data.settings.theme).toBeDefined();
    });
  });

  describe('PUT /api/v1/settings', () => {
    it('updates theme', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set(INTERNAL_HEADERS)
        .send({ theme: 'midnight' });
      expect(res.status).toBe(200);
      expect(res.body.data.theme).toBe('midnight');
    });
  });

  describe('GET /api/v1/search', () => {
    it('returns search results', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=miamo')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns empty for nonsense query', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=zzzzzzzznotauser')
        .set(INTERNAL_HEADERS);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });
});
