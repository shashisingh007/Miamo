// ─── Auth Service Unit Tests ─────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// ─── Test Setup ──────────────────────────────────────
// Auth service handles its own JWT, so we test directly against it
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import { app, prisma } from '../../../services/auth/src/server';

let accessToken: string;
let refreshToken: string;
let userId: string;

beforeAll(async () => {
  // Clean up any test user
  await prisma.user.deleteMany({ where: { email: 'unittest@miamo.test' } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'unittest@miamo.test' } });
  await prisma.$disconnect();
});

describe('Auth Service', () => {
  describe('GET /health', () => {
    it('returns 200 with service name', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('auth');
      expect(res.body.db).toBe('connected');
    });
  });

  describe('GET /ready', () => {
    it('returns ready status', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
      expect(res.body.service).toBe('auth');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user with valid fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'unittest@miamo.test', password: 'Test@12345', displayName: 'Unit Tester' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('unittest@miamo.test');
      expect(res.body.data.user.displayName).toBe('Unit Tester');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      userId = res.body.data.user.id;
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'unittest@miamo.test', password: 'Test@12345', displayName: 'Duplicate' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ password: 'Test@12345', displayName: 'No Email' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'nopass@miamo.test', displayName: 'No Pass' });
      expect(res.status).toBe(400);
    });

    it('rejects missing displayName', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'noname@miamo.test', password: 'Test@12345' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unittest@miamo.test', password: 'Test@12345' });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('unittest@miamo.test');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unittest@miamo.test', password: 'WrongPass' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@miamo.test', password: 'Test@12345' });
      expect(res.status).toBe(401);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unittest@miamo.test' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('unittest@miamo.test');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects request without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new tokens with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('rejects missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token' });
      expect(res.status).toBe(500); // jwt.verify throws
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logs out authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('rejects unauthenticated logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
