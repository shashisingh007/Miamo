// ─── E2E Tests: Full Miamo User Journey ──────────────
// Tests the complete user flow through the gateway (as mobile/web client would)
import { describe, it, expect } from 'vitest';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3200';

const api = async (method: string, path: string, body?: any, token?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
};

const testEmail = `e2e-${Date.now()}@miamo.test`;
let accessToken: string;
let refreshToken: string;
let userId: string;

describe('E2E: Full User Journey via Gateway', () => {
  // ─── 1. Health ─────────────────────────────────────
  describe('1. Gateway Health', () => {
    it('gateway is healthy', async () => {
      const { status, data } = await api('GET', '/health');
      expect(status).toBe(200);
      expect(data.service).toBe('gateway');
      expect(data.services).toBeDefined();
    });
  });

  // ─── 2. Registration ──────────────────────────────
  describe('2. Registration', () => {
    it('registers a new user', async () => {
      const { status, data } = await api('POST', '/api/v1/auth/register', {
        email: testEmail,
        password: 'E2ETest@12345',
        displayName: 'E2E Tester',
      });
      expect(status).toBe(201);
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.user.displayName).toBe('E2E Tester');
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();

      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
      userId = data.data.user.id;
    });
  });

  // ─── 3. Login ──────────────────────────────────────
  describe('3. Login', () => {
    it('logs in with registered credentials', async () => {
      const { status, data } = await api('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'E2ETest@12345',
      });
      expect(status).toBe(200);
      expect(data.data.user.id).toBe(userId);
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
    });

    it('rejects wrong credentials', async () => {
      const { status } = await api('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'WrongPassword',
      });
      expect(status).toBe(401);
    });
  });

  // ─── 4. Profile ────────────────────────────────────
  describe('4. Profile Management', () => {
    it('gets current user', async () => {
      const { status, data } = await api('GET', '/api/v1/auth/me', undefined, accessToken);
      expect(status).toBe(200);
      expect(data.data.user.email).toBe(testEmail);
    });

    it('updates profile', async () => {
      const { status, data } = await api('PUT', '/api/v1/profiles/me', {
        bio: 'E2E test bio',
        city: 'E2E City',
        age: 25,
      }, accessToken);
      expect(status).toBe(200);
      expect(data.data.bio).toBe('E2E test bio');
    });

    it('gets profile', async () => {
      const { status, data } = await api('GET', '/api/v1/profiles/me', undefined, accessToken);
      expect(status).toBe(200);
      expect(data.data.profile.bio).toBe('E2E test bio');
    });
  });

  // ─── 5. Discovery ─────────────────────────────────
  describe('5. Discovery', () => {
    it('browses discover page', async () => {
      const { status, data } = await api('GET', '/api/v1/discover', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('receives AI match suggestions', async () => {
      const { status, data } = await api('GET', '/api/v1/ai-match/suggestions', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 6. Feed ───────────────────────────────────────
  describe('6. Feed', () => {
    let postId: string;

    it('reads feed', async () => {
      const { status, data } = await api('GET', '/api/v1/feed', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('creates a post', async () => {
      const { status, data } = await api('POST', '/api/v1/feed', {
        content: 'E2E test post 🎉',
        type: 'thought',
      }, accessToken);
      expect(status).toBe(200);
      expect(data.data.content).toBe('E2E test post 🎉');
      postId = data.data.id;
    });

    it('deletes the post', async () => {
      if (!postId) return;
      const { status } = await api('DELETE', `/api/v1/feed/${postId}`, undefined, accessToken);
      expect(status).toBe(200);
    });
  });

  // ─── 7. Stories ────────────────────────────────────
  describe('7. Stories', () => {
    it('reads stories', async () => {
      const { status } = await api('GET', '/api/v1/stories', undefined, accessToken);
      expect(status).toBe(200);
    });

    it('creates a story', async () => {
      const { status, data } = await api('POST', '/api/v1/stories', {
        type: 'text',
        content: 'E2E story',
      }, accessToken);
      expect(status).toBe(200);
      expect(data.data.content).toBe('E2E story');
    });
  });

  // ─── 8. Messages ───────────────────────────────────
  describe('8. Messages', () => {
    it('lists chats', async () => {
      const { status, data } = await api('GET', '/api/v1/messages/chats', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 9. Beats ──────────────────────────────────────
  describe('9. Beats', () => {
    it('lists beats', async () => {
      const { status, data } = await api('GET', '/api/v1/beats', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 10. Notifications ─────────────────────────────
  describe('10. Notifications', () => {
    it('lists notifications', async () => {
      const { status, data } = await api('GET', '/api/v1/notifications', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('gets unread count', async () => {
      const { status, data } = await api('GET', '/api/v1/notifications/count', undefined, accessToken);
      expect(status).toBe(200);
      expect(typeof data.data.count).toBe('number');
    });
  });

  // ─── 11. Settings ──────────────────────────────────
  describe('11. Settings', () => {
    it('gets settings', async () => {
      const { status, data } = await api('GET', '/api/v1/settings', undefined, accessToken);
      expect(status).toBe(200);
      expect(data.data.settings).toBeDefined();
    });

    it('updates settings', async () => {
      const { status, data } = await api('PUT', '/api/v1/settings', {
        theme: 'midnight',
      }, accessToken);
      expect(status).toBe(200);
      expect(data.data.theme).toBe('midnight');
    });
  });

  // ─── 12. Creativity ────────────────────────────────
  describe('12. Creativity', () => {
    it('gets creativity categories', async () => {
      const { status, data } = await api('GET', '/api/v1/creativity/categories', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('gets creativity items', async () => {
      const { status, data } = await api('GET', '/api/v1/creativity/items', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 13. Safety ────────────────────────────────────
  describe('13. Safety', () => {
    it('gets safety tips', async () => {
      const { status, data } = await api('GET', '/api/v1/safety/tips', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 14. Search ────────────────────────────────────
  describe('14. Search', () => {
    it('searches for users', async () => {
      const { status, data } = await api('GET', '/api/v1/search?q=miamo', undefined, accessToken);
      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // ─── 15. Token Refresh ─────────────────────────────
  describe('15. Token Refresh', () => {
    it('refreshes access token', async () => {
      const { status, data } = await api('POST', '/api/v1/auth/refresh', { refreshToken });
      expect(status).toBe(200);
      expect(data.data.accessToken).toBeDefined();
    });
  });

  // ─── 16. Logout ────────────────────────────────────
  describe('16. Logout', () => {
    it('logs out', async () => {
      const { status, data } = await api('POST', '/api/v1/auth/logout', undefined, accessToken);
      expect(status).toBe(200);
      expect(data.data.success).toBe(true);
    });
  });

  // ─── 17. Protected Routes After Logout ─────────────
  describe('17. Auth Guard', () => {
    it('rejects without token', async () => {
      const { status } = await api('GET', '/api/v1/discover');
      expect(status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const { status } = await api('GET', '/api/v1/discover', undefined, 'invalid-token');
      expect(status).toBe(401);
    });
  });
});
