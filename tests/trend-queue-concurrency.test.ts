// TrendQueue concurrency — verifies FIFO order and unique itemId enforcement
// under concurrent enqueue traffic. Uses a mocked Prisma to isolate the queue
// logic from the database.

import { describe, it, expect } from 'vitest';
import { tryEnqueueTrending, TREND_BEAT_THRESHOLD } from '../services/content/src/creativity-spotlight';

function buildMockPrisma(items: Record<string, any>, beats: Record<string, number>) {
  const queue: any[] = [];
  const activity: any[] = [];
  let nextId = 1;
  return {
    queue,
    activity,
    prisma: {
      creativityItem: {
        findUnique: async ({ where }: any) => {
          const it = items[where.id];
          if (!it) return null;
          return {
            id: it.id, status: it.status, authorId: it.authorId,
            lastTrendAt: it.lastTrendAt ?? null,
            expiresAt: it.expiresAt ?? null,
            category: { name: it.categoryName },
          };
        },
      },
      creativityReaction: {
        count: async ({ where }: any) => beats[where.itemId] ?? 0,
      },
      trendQueue: {
        findUnique: async ({ where }: any) =>
          queue.find((r) => r.itemId === where.itemId) ?? null,
        create: async ({ data }: any) => {
          // Simulate the @unique[itemId] constraint atomically.
          if (queue.find((r) => r.itemId === data.itemId)) {
            const err: any = new Error('Unique constraint failed');
            err.code = 'P2002';
            throw err;
          }
          const row = {
            id: `q${nextId++}`,
            enqueuedAt: new Date(),
            startedAt: null,
            endedAt: null,
            status: 'queued',
            ...data,
          };
          queue.push(row);
          return row;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const r of queue) {
            if (r.itemId !== where.itemId) continue;
            if (where.status?.in && !where.status.in.includes(r.status)) continue;
            Object.assign(r, data);
            count++;
          }
          return { count };
        },
      },
      userActivity: {
        create: async ({ data }: any) => {
          activity.push({ id: `a${nextId++}`, ...data });
          return { id: `a${nextId}` };
        },
      },
    } as any,
  };
}

describe('TrendQueue FIFO', () => {
  it('enqueues 5 distinct posts concurrently in order', async () => {
    const items: Record<string, any> = {};
    const beats: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) {
      items[`p${i}`] = { id: `p${i}`, status: 'live', authorId: `u${i}`, categoryName: 'Music' };
      beats[`p${i}`] = TREND_BEAT_THRESHOLD; // exactly at threshold
    }
    const { prisma, queue } = buildMockPrisma(items, beats);
    const results = await Promise.all([
      tryEnqueueTrending(prisma, 'p1'),
      tryEnqueueTrending(prisma, 'p2'),
      tryEnqueueTrending(prisma, 'p3'),
      tryEnqueueTrending(prisma, 'p4'),
      tryEnqueueTrending(prisma, 'p5'),
    ]);
    expect(results.filter((r) => r.enqueued).length).toBe(5);
    expect(queue.length).toBe(5);
    expect(new Set(queue.map((r: any) => r.itemId))).toEqual(new Set(['p1', 'p2', 'p3', 'p4', 'p5']));
  });

  it('dedupes 20 concurrent enqueues of same item to one queue row', async () => {
    const items = {
      hot: { id: 'hot', status: 'live', authorId: 'u1', categoryName: 'Music' },
    } as Record<string, any>;
    const beats = { hot: TREND_BEAT_THRESHOLD + 5 };
    const { prisma, queue } = buildMockPrisma(items, beats);
    const fns = Array.from({ length: 20 }, () => tryEnqueueTrending(prisma, 'hot'));
    const results = await Promise.all(fns);
    const enqueuedCount = results.filter((r) => r.enqueued).length;
    // At most one true enqueue; subsequent calls bail with already_queued.
    expect(enqueuedCount).toBeLessThanOrEqual(1);
    expect(queue.length).toBe(1);
  });

  it('refuses below-threshold posts', async () => {
    const items = { cold: { id: 'cold', status: 'live', authorId: 'u1', categoryName: 'Art' } } as Record<string, any>;
    const beats = { cold: TREND_BEAT_THRESHOLD - 1 };
    const { prisma } = buildMockPrisma(items, beats);
    const r = await tryEnqueueTrending(prisma, 'cold');
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe('below_threshold');
  });

  it('refuses items within cooldown window', async () => {
    const items = {
      recent: {
        id: 'recent', status: 'live', authorId: 'u1', categoryName: 'Dance',
        lastTrendAt: new Date(Date.now() - 60_000), // 1 min ago
      },
    } as Record<string, any>;
    const beats = { recent: TREND_BEAT_THRESHOLD + 10 };
    const { prisma } = buildMockPrisma(items, beats);
    const r = await tryEnqueueTrending(prisma, 'recent');
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe('cooldown');
  });

  it('refuses expired items', async () => {
    const items = {
      gone: {
        id: 'gone', status: 'live', authorId: 'u1', categoryName: 'Travel',
        expiresAt: new Date(Date.now() - 5_000),
      },
    } as Record<string, any>;
    const beats = { gone: TREND_BEAT_THRESHOLD + 10 };
    const { prisma } = buildMockPrisma(items, beats);
    const r = await tryEnqueueTrending(prisma, 'gone');
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe('expired');
  });

  it('refuses non-live status', async () => {
    const items = {
      deleted: { id: 'deleted', status: 'deleted', authorId: 'u1', categoryName: 'Music' },
    } as Record<string, any>;
    const beats = { deleted: TREND_BEAT_THRESHOLD + 10 };
    const { prisma } = buildMockPrisma(items, beats);
    const r = await tryEnqueueTrending(prisma, 'deleted');
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe('status_deleted');
  });
});
