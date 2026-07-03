// ─── Discover seed for empty queues (G.18) ────────────────────────
//
// Purpose: when a brand-new user's Discover queue would be empty (they've
// passed / liked their entire eligible pool, or the eligible pool is
// small on day 1), backfill it with up to 20 high-quality profiles ranked
// by profileHealth (Phase E) so nobody sees a blank Discover.
//
// Feature flag: `FEATURE_DISCOVER_SEED_ENABLED=1`. Off (default) = the
// caller returns an empty list as today, preserving v1 behaviour. On =
// backfill runs when the primary pool returns 0 candidates.
//
// Cross-refs:
//   - docs/architecture/activation-funnel.md (G.18 §Day-1 empty-Discover seed)
//   - services/social/src/server.ts (wire point: GET /api/v1/discover)

// PrismaClient is typed as `any` here because social's schema mirror
// deliberately omits fields like Profile.profileHealth (owned by the
// shared schema + generated in shared's node_modules). The seed query
// runs against the runtime-shared Prisma client so the fields exist at
// runtime; this file's typing is intentionally loose.
type PrismaClient = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DiscoverSeedCandidate {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  profile: {
    age: number | null;
    city: string | null;
    gender: string | null;
    datingIntent: string | null;
    bio: string | null;
    profileHealth: number | null;
  } | null;
  photos: Array<{ url: string; position: number }>;
}

export interface DiscoverSeedOptions {
  /** How many seed profiles to return. Default 20; hard cap 50. */
  count?: number;
  /** IDs to exclude (blocks, self, already-liked). */
  excludeIds?: string[];
  /** Preferred candidate city — mildly boosted, not filtered. */
  preferCity?: string | null;
}

export function isDiscoverSeedEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FEATURE_DISCOVER_SEED_ENABLED === '1';
}

/**
 * Fetch up to `count` seeded profiles ordered by profileHealth desc.
 * Never throws — a DB error returns an empty list so the caller can
 * continue serving `data: []` to the client.
 */
export async function fetchDiscoverSeed(
  prisma: PrismaClient,
  opts: DiscoverSeedOptions = {},
): Promise<DiscoverSeedCandidate[]> {
  const count = Math.max(1, Math.min(opts.count ?? 20, 50));
  const excludeIds = Array.isArray(opts.excludeIds) ? opts.excludeIds : [];
  try {
    // Ordering is profileHealth desc → verified desc → createdAt desc so
    // ties break to the more-recent joiner (encouraging fresh cohort
    // visibility over the exact same top-20 every day).
    const rows = await prisma.user.findMany({
      where: {
        active: true,
        deactivated: false,
        id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        profile: { profileHealth: { gte: 0.5 } },
        privacySettings: { profileVisible: true },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        verified: true,
        profile: {
          select: { age: true, city: true, gender: true, datingIntent: true, bio: true, profileHealth: true },
        },
        photos: { select: { url: true, position: true }, orderBy: { position: 'asc' }, take: 3 },
      },
      orderBy: [
        { profile: { profileHealth: 'desc' } },
        { verified: 'desc' },
        { createdAt: 'desc' },
      ],
      take: count * 2, // over-fetch so we can nudge with preferCity below
    });

    // City preference tweak — profiles matching the requester's preferCity
    // float to the top of the seed while preserving overall profileHealth
    // order. Stable sort in JS.
    const preferCity = (opts.preferCity ?? '').trim().toLowerCase();
    const scored = (rows as DiscoverSeedCandidate[]).map((r, i) => {
      const cityMatch = preferCity && r.profile?.city && r.profile.city.toLowerCase() === preferCity ? 1 : 0;
      return { r, orderKey: -cityMatch, tiebreak: i };
    });
    scored.sort((a, b) => (a.orderKey - b.orderKey) || (a.tiebreak - b.tiebreak));
    return scored.slice(0, count).map((s) => s.r);
  } catch {
    return [];
  }
}
