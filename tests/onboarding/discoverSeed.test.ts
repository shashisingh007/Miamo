/**
 * discover-seed — G.18 tests. Uses an in-memory mock Prisma client so
 * the fetch logic is verified without a real DB.
 */

import { describe, it, expect } from 'vitest';
import { fetchDiscoverSeed, isDiscoverSeedEnabled } from '../../services/social/src/discover-seed';
import { isV6Event, validateV6Payload, V6_VALIDATORS } from '../../services/shared/src/track/v6Validators';

type Row = {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  profile: { age: number | null; city: string | null; gender: string | null; datingIntent: string | null; bio: string | null; profileHealth: number | null } | null;
  photos: Array<{ url: string; position: number }>;
};

function mockPrisma(rows: Row[]): any {
  return {
    user: {
      findMany: async (args: any): Promise<Row[]> => {
        let filtered = rows;
        if (args?.where?.id?.notIn) {
          const excl = new Set<string>(args.where.id.notIn);
          filtered = filtered.filter(r => !excl.has(r.id));
        }
        if (args?.where?.profile?.profileHealth?.gte !== undefined) {
          const gte = args.where.profile.profileHealth.gte;
          filtered = filtered.filter(r => (r.profile?.profileHealth ?? 0) >= gte);
        }
        // Sort by profileHealth desc → verified desc → id desc as a proxy for createdAt.
        filtered = [...filtered].sort((a, b) => {
          const ph = (b.profile?.profileHealth ?? 0) - (a.profile?.profileHealth ?? 0);
          if (ph !== 0) return ph;
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return b.id.localeCompare(a.id);
        });
        return filtered.slice(0, args?.take ?? filtered.length);
      },
    },
  };
}

function makeRow(id: string, health: number, city = 'Bengaluru', verified = false): Row {
  return {
    id, username: `u_${id}`, displayName: `User ${id}`, verified,
    profile: { age: 28, city, gender: 'female', datingIntent: 'serious', bio: 'test', profileHealth: health },
    photos: [{ url: `https://cdn/${id}.jpg`, position: 0 }],
  };
}

describe('isDiscoverSeedEnabled', () => {
  it('respects the env flag', () => {
    expect(isDiscoverSeedEnabled({})).toBe(false);
    expect(isDiscoverSeedEnabled({ FEATURE_DISCOVER_SEED_ENABLED: '1' })).toBe(true);
    expect(isDiscoverSeedEnabled({ FEATURE_DISCOVER_SEED_ENABLED: '0' })).toBe(false);
  });
});

describe('fetchDiscoverSeed', () => {
  it('returns up to `count` results ordered by profileHealth desc', async () => {
    const rows = [
      makeRow('a', 0.9), makeRow('b', 0.6), makeRow('c', 0.8), makeRow('d', 0.75),
    ];
    const out = await fetchDiscoverSeed(mockPrisma(rows), { count: 2 });
    expect(out).toHaveLength(2);
    expect(out[0].profile?.profileHealth).toBe(0.9);
    expect(out[1].profile?.profileHealth).toBe(0.8);
  });

  it('filters out excludeIds', async () => {
    const rows = [makeRow('a', 0.9), makeRow('b', 0.85)];
    const out = await fetchDiscoverSeed(mockPrisma(rows), { count: 10, excludeIds: ['a'] });
    expect(out.map(r => r.id)).toEqual(['b']);
  });

  it('boosts preferCity matches to the top while preserving overall order', async () => {
    const rows = [
      makeRow('bhi', 0.95, 'Mumbai'),
      makeRow('a', 0.9, 'Bengaluru'),
      makeRow('b', 0.85, 'Mumbai'),
      makeRow('c', 0.8, 'Bengaluru'),
    ];
    const out = await fetchDiscoverSeed(mockPrisma(rows), { count: 4, preferCity: 'Bengaluru' });
    // Bengaluru profiles should float; among Bengaluru, higher health wins.
    expect(out[0].profile?.city).toBe('Bengaluru');
    expect(out[1].profile?.city).toBe('Bengaluru');
  });

  it('clamps count to at least 1 and at most 50', async () => {
    const rows = Array.from({ length: 100 }).map((_, i) => makeRow(`u${i}`, 0.9));
    // Ask for -5 → clamped to 1
    expect((await fetchDiscoverSeed(mockPrisma(rows), { count: -5 })).length).toBe(1);
    // Ask for 500 → clamped to 50
    expect((await fetchDiscoverSeed(mockPrisma(rows), { count: 500 })).length).toBe(50);
  });

  it('returns [] on any DB error (never throws)', async () => {
    const brokenPrisma: any = { user: { throw: async () => { throw new Error('db-down'); }, findMany: async () => { throw new Error('db-down'); } } };
    const out = await fetchDiscoverSeed(brokenPrisma);
    expect(out).toEqual([]);
  });
});

// ─── Task 1b — discover.seeded_fallback v6 validator ───────────────
describe('discover.seeded_fallback event schema', () => {
  it('is registered as a v6 event', () => {
    expect(isV6Event('discover.seeded_fallback')).toBe(true);
    expect(V6_VALIDATORS['discover.seeded_fallback' as keyof typeof V6_VALIDATORS]).toBeDefined();
  });

  it('accepts a well-formed payload', () => {
    const r = validateV6Payload('discover.seeded_fallback', {
      naturalCount: 2, seededCount: 8, preferCity: 'Bengaluru',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects negative counts + unknown keys (strict boundary)', () => {
    expect(validateV6Payload('discover.seeded_fallback', { naturalCount: -1, seededCount: 0 }).ok).toBe(false);
    expect(validateV6Payload('discover.seeded_fallback', { naturalCount: 0, seededCount: 0, evilExtra: 'x' }).ok).toBe(false);
  });

  it('allows preferCity=null and omission', () => {
    expect(validateV6Payload('discover.seeded_fallback', { naturalCount: 0, seededCount: 0, preferCity: null }).ok).toBe(true);
    expect(validateV6Payload('discover.seeded_fallback', { naturalCount: 0, seededCount: 0 }).ok).toBe(true);
  });
});
