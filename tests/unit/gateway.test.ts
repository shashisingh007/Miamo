// ─── Gateway Unit Tests ──────────────────────────────
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

import { app } from '../../../services/gateway/src/server';

describe('Gateway Service', () => {
  describe('GET /health', () => {
    it('returns 200 with gateway info', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('gateway');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.services).toBeDefined();
    });
  });

  describe('Auth Validation', () => {
    it('rejects protected routes without token', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects for /api/v1/profiles without token', async () => {
      const res = await request(app).get('/api/v1/profiles/me');
      expect(res.status).toBe(401);
    });

    it('rejects for /api/v1/discover without token', async () => {
      const res = await request(app).get('/api/v1/discover');
      expect(res.status).toBe(401);
    });

    it('rejects for /api/v1/messages without token', async () => {
      const res = await request(app).get('/api/v1/messages/chats');
      expect(res.status).toBe(401);
    });

    it('rejects for /api/v1/notifications without token', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('404 Handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('CORS', () => {
    it('sets Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3100')
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
