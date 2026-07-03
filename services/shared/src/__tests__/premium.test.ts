/**
 * Tests for v3.6.0 User.premium resolver.
 *
 * Covers: active flag semantics (premium + expiry), Prisma error fail-closed,
 * 60s cache hit/miss, cache invalidation, and bulk-resolver behaviour.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isUserPremium, isUserPremiumBulk, clearPremiumCache, _internals } from '../premium';

/** Minimal Prisma mock — only the surface premium.ts touches. */
function makePrismaMock(opts: {
  findUnique?: (args: any) => Promise<any> | any;
  findMany?: (args: any) => Promise<any> | any;
}): any {
  return {
    user: {
      findUnique: opts.findUnique ?? (() => Promise.resolve(null)),
      findMany: opts.findMany ?? (() => Promise.resolve([])),
    },
  };
}

describe('premium resolver — isUserPremium', () => {
  beforeEach(() => {
    clearPremiumCache();
  });

  it('returns true when premium=true AND premiumUntil is null', async () => {
    const prisma = makePrismaMock({
      findUnique: async () => ({ premium: true, premiumUntil: null }),
    });
    expect(await isUserPremium(prisma, 'u1')).toBe(true);
  });

  it('returns true when premium=true AND premiumUntil is in the future', async () => {
    const future = new Date(Date.now() + 86400_000); // +1 day
    const prisma = makePrismaMock({
      findUnique: async () => ({ premium: true, premiumUntil: future }),
    });
    expect(await isUserPremium(prisma, 'u2')).toBe(true);
  });

  it('returns false when premium=true BUT premiumUntil is in the past (expired)', async () => {
    const past = new Date(Date.now() - 86400_000); // -1 day
    const prisma = makePrismaMock({
      findUnique: async () => ({ premium: true, premiumUntil: past }),
    });
    expect(await isUserPremium(prisma, 'u3')).toBe(false);
  });

  it('returns false when premium=false (regardless of premiumUntil)', async () => {
    const future = new Date(Date.now() + 86400_000);
    const prisma = makePrismaMock({
      findUnique: async () => ({ premium: false, premiumUntil: future }),
    });
    expect(await isUserPremium(prisma, 'u4')).toBe(false);
  });

  it('returns false when the user row is missing (findUnique → null)', async () => {
    const prisma = makePrismaMock({ findUnique: async () => null });
    expect(await isUserPremium(prisma, 'ghost')).toBe(false);
  });

  it('returns false on Prisma error (fail-closed)', async () => {
    const prisma = makePrismaMock({
      findUnique: async () => { throw new Error('db down'); },
    });
    expect(await isUserPremium(prisma, 'u5')).toBe(false);
  });

  it('caches on second call within 60s (DB called once)', async () => {
    const findUnique = vi.fn().mockResolvedValue({ premium: true, premiumUntil: null });
    const prisma = makePrismaMock({ findUnique });
    expect(await isUserPremium(prisma, 'cache-1')).toBe(true);
    expect(await isUserPremium(prisma, 'cache-1')).toBe(true);
    expect(await isUserPremium(prisma, 'cache-1')).toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('cache miss after TTL elapses (DB called again)', async () => {
    const findUnique = vi.fn().mockResolvedValue({ premium: true, premiumUntil: null });
    const prisma = makePrismaMock({ findUnique });
    expect(await isUserPremium(prisma, 'cache-2')).toBe(true);
    // Force the cache entry to be stale by rewriting its expires timestamp.
    const entry = _internals.cache.get('cache-2');
    if (entry) entry.expires = Date.now() - 1;
    expect(await isUserPremium(prisma, 'cache-2')).toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('clearPremiumCache(userId) invalidates only that user', async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ premium: true, premiumUntil: null })   // u-a first
      .mockResolvedValueOnce({ premium: false, premiumUntil: null })  // u-b first
      .mockResolvedValueOnce({ premium: true, premiumUntil: null });  // u-a after clear
    const prisma = makePrismaMock({ findUnique });
    expect(await isUserPremium(prisma, 'u-a')).toBe(true);
    expect(await isUserPremium(prisma, 'u-b')).toBe(false);
    clearPremiumCache('u-a');
    // u-a should re-fetch; u-b should still be cached.
    expect(await isUserPremium(prisma, 'u-a')).toBe(true);
    expect(await isUserPremium(prisma, 'u-b')).toBe(false);
    expect(findUnique).toHaveBeenCalledTimes(3);
  });

  it('clearPremiumCache() with no args clears everything', async () => {
    const findUnique = vi.fn().mockResolvedValue({ premium: true, premiumUntil: null });
    const prisma = makePrismaMock({ findUnique });
    await isUserPremium(prisma, 'u-x');
    await isUserPremium(prisma, 'u-y');
    expect(findUnique).toHaveBeenCalledTimes(2);
    clearPremiumCache();
    await isUserPremium(prisma, 'u-x');
    await isUserPremium(prisma, 'u-y');
    expect(findUnique).toHaveBeenCalledTimes(4);
  });
});

describe('premium resolver — isUserPremiumBulk', () => {
  beforeEach(() => {
    clearPremiumCache();
  });

  it('returns empty Map for empty input', async () => {
    const prisma = makePrismaMock({});
    const out = await isUserPremiumBulk(prisma, []);
    expect(out.size).toBe(0);
  });

  it('resolves a batch in a single findMany call', async () => {
    const future = new Date(Date.now() + 86400_000);
    const past = new Date(Date.now() - 86400_000);
    const findMany = vi.fn().mockResolvedValue([
      { id: 'a', premium: true, premiumUntil: null },
      { id: 'b', premium: true, premiumUntil: future },
      { id: 'c', premium: true, premiumUntil: past },
      { id: 'd', premium: false, premiumUntil: null },
    ]);
    const prisma = makePrismaMock({ findMany });
    const out = await isUserPremiumBulk(prisma, ['a', 'b', 'c', 'd']);
    expect(out.get('a')).toBe(true);
    expect(out.get('b')).toBe(true);
    expect(out.get('c')).toBe(false);
    expect(out.get('d')).toBe(false);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('defaults missing users to false (not in DB result)', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'present', premium: true, premiumUntil: null },
    ]);
    const prisma = makePrismaMock({ findMany });
    const out = await isUserPremiumBulk(prisma, ['present', 'missing']);
    expect(out.get('present')).toBe(true);
    expect(out.get('missing')).toBe(false);
  });

  it('returns all-false on Prisma error (fail-closed)', async () => {
    const prisma = makePrismaMock({
      findMany: async () => { throw new Error('db down'); },
    });
    const out = await isUserPremiumBulk(prisma, ['x', 'y', 'z']);
    expect(out.size).toBe(3);
    expect(out.get('x')).toBe(false);
    expect(out.get('y')).toBe(false);
    expect(out.get('z')).toBe(false);
  });

  it('populates the single-user cache so subsequent isUserPremium hits memory', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'cached', premium: true, premiumUntil: null },
    ]);
    const findUnique = vi.fn(); // should NOT be called
    const prisma = makePrismaMock({ findMany, findUnique });
    await isUserPremiumBulk(prisma, ['cached']);
    expect(await isUserPremium(prisma, 'cached')).toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
