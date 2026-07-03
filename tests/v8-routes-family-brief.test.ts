/**
 * v3.6.0 Family Brief — token generation, expiry semantics, schema gating.
 *
 * Pure unit tests: simulates the route's persistence layer with a Map-backed
 * stub. Exercises the round-trip without booting express.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { familyBriefGenerateBodySchema } from '../services/shared/src/schemas';

interface ShareRow {
  id: string;
  userId: string;
  token: string;
  format: string;
  generatedAt: Date;
  expiresAt: Date;
  viewCount: number;
  trackViews: boolean;
}

function generateBriefToken(): string {
  return crypto.randomBytes(17).toString('base64url').slice(0, 22);
}

function makeStubPrisma() {
  const store = new Map<string, ShareRow>();
  return {
    store,
    async create(data: Omit<ShareRow, 'id'>) {
      const row: ShareRow = { id: crypto.randomUUID(), ...data };
      store.set(row.token, row);
      return row;
    },
    async findByToken(token: string) {
      return store.get(token) ?? null;
    },
    async incrementViewCount(token: string) {
      const row = store.get(token);
      if (!row) return null;
      row.viewCount += 1;
      return row;
    },
  };
}

async function generate(prisma: ReturnType<typeof makeStubPrisma>, userId: string, body: unknown): Promise<{ status: number; body: any }> {
  if (process.env.FEATURE_FAMILY_BRIEF_ENABLED !== '1') return { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
  if (!userId) return { status: 401, body: { error: { message: 'Unauthorized' } } };
  const parsed = familyBriefGenerateBodySchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: { message: 'Invalid request' } } };
  const token = generateBriefToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await prisma.create({ userId, token, format: parsed.data.format, generatedAt: now, expiresAt, viewCount: 0, trackViews: parsed.data.trackViews === true });
  return { status: 200, body: { token, url: `/api/v1/dtm/family-brief/${token}`, expiresAt: expiresAt.toISOString() } };
}

async function view(prisma: ReturnType<typeof makeStubPrisma>, token: string): Promise<{ status: number; body: any }> {
  if (process.env.FEATURE_FAMILY_BRIEF_ENABLED !== '1') return { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
  const share = await prisma.findByToken(token);
  if (!share) return { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
  if (share.expiresAt.getTime() < Date.now()) return { status: 404, body: { error: { message: 'Expired', code: 'NOT_FOUND' } } };
  if (share.trackViews) await prisma.incrementViewCount(token);
  return { status: 200, body: { token: share.token, format: share.format, text: `Family Brief for ${share.userId}` } };
}

describe('v3.6.0 family-brief route logic', () => {
  beforeEach(() => { delete process.env.FEATURE_FAMILY_BRIEF_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_FAMILY_BRIEF_ENABLED; });

  it('flag OFF → generate returns 404', async () => {
    const prisma = makeStubPrisma();
    const res = await generate(prisma, 'u1', { format: 'text' });
    expect(res.status).toBe(404);
  });

  it('flag OFF → view returns 404', async () => {
    const prisma = makeStubPrisma();
    const res = await view(prisma, 'anytoken');
    expect(res.status).toBe(404);
  });

  it('flag ON → generate then view round-trip works', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const gen = await generate(prisma, 'u1', { format: 'text' });
    expect(gen.status).toBe(200);
    expect(gen.body.token).toBeTruthy();
    expect(gen.body.token.length).toBe(22);
    expect(gen.body.url).toBe(`/api/v1/dtm/family-brief/${gen.body.token}`);
    const v = await view(prisma, gen.body.token);
    expect(v.status).toBe(200);
    expect(v.body.text).toContain('Family Brief');
    expect(v.body.format).toBe('text');
  });

  it('expired token returns 404', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const gen = await generate(prisma, 'u1', { format: 'text' });
    const row = prisma.store.get(gen.body.token)!;
    row.expiresAt = new Date(Date.now() - 1000);
    const v = await view(prisma, gen.body.token);
    expect(v.status).toBe(404);
  });

  it('viewCount increments only when trackViews=true', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const gen = await generate(prisma, 'u1', { format: 'text', trackViews: true });
    const token = gen.body.token;
    await view(prisma, token);
    await view(prisma, token);
    expect(prisma.store.get(token)!.viewCount).toBe(2);
  });

  it('viewCount stays 0 when trackViews=false (default)', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const gen = await generate(prisma, 'u1', { format: 'text' });
    const token = gen.body.token;
    await view(prisma, token);
    await view(prisma, token);
    expect(prisma.store.get(token)!.viewCount).toBe(0);
  });

  it('schema rejects bad format', () => {
    expect(familyBriefGenerateBodySchema.safeParse({ format: 'docx' }).success).toBe(false);
  });

  it('schema accepts pdf/image/text', () => {
    expect(familyBriefGenerateBodySchema.safeParse({ format: 'pdf' }).success).toBe(true);
    expect(familyBriefGenerateBodySchema.safeParse({ format: 'image' }).success).toBe(true);
    expect(familyBriefGenerateBodySchema.safeParse({ format: 'text' }).success).toBe(true);
  });

  it('generated token is 22 chars base64url', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const gen = await generate(prisma, 'u1', { format: 'text' });
    expect(/^[A-Za-z0-9_-]{22}$/.test(gen.body.token)).toBe(true);
  });

  it('two generations produce distinct tokens', async () => {
    process.env.FEATURE_FAMILY_BRIEF_ENABLED = '1';
    const prisma = makeStubPrisma();
    const a = await generate(prisma, 'u1', { format: 'text' });
    const b = await generate(prisma, 'u1', { format: 'text' });
    expect(a.body.token).not.toBe(b.body.token);
  });
});
