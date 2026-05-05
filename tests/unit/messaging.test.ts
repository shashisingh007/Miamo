// ─── Messaging Service Unit Tests ────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';

import { app, prisma } from '../../../services/messaging/src/server';

const headers = (userId: string) => ({
  'x-user-id': userId,
  'x-internal-key': 'test-internal-key',
});

let user1Id: string;
let chatId: string;
let messageId: string;

beforeAll(async () => {
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true } });
  if (!user) throw new Error('No seeded users found');
  user1Id = user.id;

  // Find a chat this user is part of
  const chat = await prisma.chat.findFirst({
    where: { OR: [{ user1Id: user1Id }, { user2Id: user1Id }] },
    select: { id: true },
  });
  if (chat) chatId = chat.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Messaging Service', () => {
  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('messaging');
    });
  });

  describe('GET /ready', () => {
    it('returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  // ─── Chats ─────────────────────────────────────────
  describe('GET /api/v1/messages/chats', () => {
    it('returns chats list', async () => {
      const res = await request(app)
        .get('/api/v1/messages/chats')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects without auth', async () => {
      const res = await request(app).get('/api/v1/messages/chats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/messages/chats/archived', () => {
    it('returns archived chats', async () => {
      const res = await request(app)
        .get('/api/v1/messages/chats/archived')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Messages ──────────────────────────────────────
  describe('Chat Messages', () => {
    it('GET messages from a chat', async () => {
      if (!chatId) return; // skip if no chats
      const res = await request(app)
        .get(`/api/v1/messages/chats/${chatId}/messages`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        messageId = res.body.data[0].id;
      }
    });

    it('POST sends a message', async () => {
      if (!chatId) return;
      const res = await request(app)
        .post(`/api/v1/messages/chats/${chatId}/messages`)
        .set(headers(user1Id))
        .send({ content: 'Hello from unit test!', type: 'text' });
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Hello from unit test!');
      messageId = res.body.data.id;
    });

    it('PUT edits a message', async () => {
      if (!messageId) return;
      const res = await request(app)
        .put(`/api/v1/messages/messages/${messageId}`)
        .set(headers(user1Id))
        .send({ content: 'Edited from unit test' });
      expect(res.status).toBe(200);
    });
  });

  // ─── Chat Actions ─────────────────────────────────
  describe('Chat Actions', () => {
    it('pins a chat', async () => {
      if (!chatId) return;
      const res = await request(app)
        .post(`/api/v1/messages/chats/${chatId}/pin`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
    });

    it('mutes a chat', async () => {
      if (!chatId) return;
      const res = await request(app)
        .post(`/api/v1/messages/chats/${chatId}/mute`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
    });

    it('archives a chat', async () => {
      if (!chatId) return;
      const res = await request(app)
        .post(`/api/v1/messages/chats/${chatId}/archive`)
        .set(headers(user1Id));
      expect(res.status).toBe(200);
    });
  });

  // ─── Beats ─────────────────────────────────────────
  describe('GET /api/v1/beats', () => {
    it('returns beats list', async () => {
      const res = await request(app)
        .get('/api/v1/beats')
        .set(headers(user1Id));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects without auth', async () => {
      const res = await request(app).get('/api/v1/beats');
      expect(res.status).toBe(401);
    });
  });
});
