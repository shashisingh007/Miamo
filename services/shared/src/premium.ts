/**
 * v3.6.0 — User.premium resolver.
 *
 * Returns whether a user has *active* premium right now. "Active" means
 * `premium=true` AND (`premiumUntil` is null OR `premiumUntil > now`).
 * Treats Prisma errors as non-premium so a failing DB never fails open
 * to free premium perks (anti-ghost waiver, 1.5× exposure-credit boost,
 * Top-10 threshold relief).
 *
 * Spec: DESIGN_SECTION_B_exposure_and_ranking.md §B.5.5.
 */
import type { PrismaClient } from '@prisma/client';

// because: premium changes via subscription webhook; 60s lag acceptable.
// Tight enough that an upgrade ripples through within a minute, loose
// enough to spare the DB from per-action lookups in hot paths.
const PREMIUM_CACHE_TTL_MS = 60_000;

const cache = new Map<string, { isPremium: boolean; expires: number }>();

/**
 * Resolve whether a user is currently premium. Cached for 60s per-userId.
 * Returns false on any Prisma error (fail-closed).
 */
export async function isUserPremium(prisma: PrismaClient, userId: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expires > now) return hit.isPremium;
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { premium: true, premiumUntil: true },
    });
    const active = Boolean(u?.premium && (!u?.premiumUntil || u.premiumUntil.getTime() > now));
    cache.set(userId, { isPremium: active, expires: now + PREMIUM_CACHE_TTL_MS });
    return active;
  } catch {
    return false;
  }
}

/**
 * Clear the cache for one user (call from the subscription webhook) or
 * everything (test reset, ops nuke).
 */
export function clearPremiumCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/**
 * Bulk-resolve premium for many users in one query. Used by worker loops
 * (e.g. exposureScheduler) that classify a batch of users per tick and
 * want to avoid N+1 lookups. Returns a Map keyed by userId.
 *
 * Bypasses the cache on read but populates it on write so subsequent
 * single-user calls within the TTL hit memory.
 */
export async function isUserPremiumBulk(
  prisma: PrismaClient,
  userIds: readonly string[],
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (userIds.length === 0) return out;
  const now = Date.now();
  try {
    const rows = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, premium: true, premiumUntil: true },
    });
    const seen = new Set<string>();
    for (const u of rows) {
      const active = Boolean(u.premium && (!u.premiumUntil || u.premiumUntil.getTime() > now));
      out.set(u.id, active);
      cache.set(u.id, { isPremium: active, expires: now + PREMIUM_CACHE_TTL_MS });
      seen.add(u.id);
    }
    // Users not returned by the DB (deleted, missing) → default to false.
    for (const id of userIds) if (!seen.has(id)) out.set(id, false);
    return out;
  } catch {
    for (const id of userIds) out.set(id, false);
    return out;
  }
}

/** Test-only handles. */
export const _internals = { cache, PREMIUM_CACHE_TTL_MS };
