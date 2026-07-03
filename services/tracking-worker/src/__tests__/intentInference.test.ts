/**
 * intentInference loop tests — v3.6.0 Section A.7.
 *
 * Uses a minimal in-memory Prisma stub (same pattern as
 * tests/spotlight-ledger.test.ts) to exercise:
 *   - Flag-gated start/stop.
 *   - Tier classification.
 *   - Consent gates (moodInferenceEnabled, behavioralRankingEnabled).
 *   - JSONB merge preservation.
 *   - MAX_USERS_PER_TICK cap.
 *   - Counter wiring.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntentInferenceLoop,
  MAX_USERS_PER_TICK,
  Counter,
  _internals,
} from '../intentInference';
import { hashUid } from '../../../shared/src/track/hash';
import { ALL_INTENT_CLASSES } from '../../../shared/src/algo/v8/intentRightNow';

const {
  classifyTier, activityToRecentEvent, buildViewerFeatures, buildMoodInput,
  buildRawPatch, counters,
} = _internals;

// ─── Prisma stub ─────────────────────────────────────────────────────────────

type SettingsRow = { userId: string; moodInferenceEnabled: boolean; behavioralRankingEnabled: boolean };
type FsRow = { uidHash: string; chronotype: string | null; attentionProfile: string | null; rageClickRate: number | null; raw: Record<string, unknown> };
type ActRow = { userId: string; action: string; targetType: string | null; metadata: string | null; durationMs: number | null; createdAt: Date };

function buildMockPrisma(opts: {
  candidates: Array<{ uidHash: string; lastActivityAtMs: number }>;
  activitiesByUid?: Record<string, ActRow[]>;
  settings?: SettingsRow[];
  initialFeatureSnapshot?: Record<string, FsRow>;
}) {
  const fsByUid: Record<string, FsRow> = { ...(opts.initialFeatureSnapshot || {}) };
  const writes: Array<{ uidHash: string; raw: Record<string, unknown> }> = [];
  const queriesSeen: string[] = [];

  const matches = (sql: string, needle: string): boolean =>
    sql.replace(/\s+/g, ' ').toUpperCase().includes(needle.toUpperCase());

  const prisma = {
    $queryRawUnsafe: async (sql: string, ...params: unknown[]): Promise<unknown> => {
      queriesSeen.push(sql);
      if (matches(sql, 'FROM "USERACTIVITY"') && matches(sql, 'GROUP BY')) {
        // Candidate discovery query.
        return opts.candidates.map((c) => ({
          uidHash: c.uidHash,
          lastActivityAt: new Date(c.lastActivityAtMs),
        }));
      }
      if (matches(sql, 'FROM "USERACTIVITY"') && matches(sql, 'ORDER BY')) {
        // Per-user activity pull. param[0] is uidHash.
        const uid = params[0] as string;
        const rows = opts.activitiesByUid?.[uid] || [];
        return rows.map((r) => ({
          uidHash: r.userId,
          action: r.action,
          targetType: r.targetType,
          metadata: r.metadata,
          durationMs: r.durationMs,
          createdAtMs: r.createdAt.getTime(),
        }));
      }
      if (matches(sql, 'FROM "FEATURESNAPSHOT"')) {
        const uid = params[0] as string;
        const row = fsByUid[uid];
        return row ? [row] : [];
      }
      if (matches(sql, 'FROM "SETTINGS"')) {
        return opts.settings || [];
      }
      return [];
    },
    $executeRawUnsafe: async (sql: string, ...params: unknown[]): Promise<number> => {
      queriesSeen.push(sql);
      if (matches(sql, 'INSERT INTO "FEATURESNAPSHOT"')) {
        const uid = params[0] as string;
        const raw = JSON.parse(params[1] as string) as Record<string, unknown>;
        // Mimic the DB-side merge: existing keys preserved, EXCLUDED.raw overrides matching keys.
        const existing = fsByUid[uid]?.raw || {};
        const merged = { ...existing, ...raw };
        fsByUid[uid] = {
          uidHash: uid,
          chronotype: fsByUid[uid]?.chronotype ?? null,
          attentionProfile: fsByUid[uid]?.attentionProfile ?? null,
          rageClickRate: fsByUid[uid]?.rageClickRate ?? null,
          raw: merged,
        };
        writes.push({ uidHash: uid, raw });
        return 1;
      }
      return 0;
    },
  } as unknown as ConstructorParameters<typeof IntentInferenceLoop>[0];

  return { prisma, fsByUid, writes, queriesSeen };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function actRow(uid: string, action: string, ageMs: number, nowMs: number, extras: Partial<ActRow> = {}): ActRow {
  return {
    userId: uid,
    action,
    targetType: null,
    metadata: null,
    durationMs: null,
    createdAt: new Date(nowMs - ageMs),
    ...extras,
  };
}

beforeEach(() => {
  counters.runs.reset();
  counters.writes.reset();
  counters.skippedConsent.reset();
  counters.errors.reset();
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe('classifyTier', () => {
  it('returns active for <2min ages', () => {
    expect(classifyTier(0)).toBe('active');
    expect(classifyTier(2 * 60_000 - 1)).toBe('active');
  });
  it('returns recent for [2min, 1h)', () => {
    expect(classifyTier(2 * 60_000)).toBe('recent');
    expect(classifyTier(60 * 60_000 - 1)).toBe('recent');
  });
  it('returns idle for >=1h', () => {
    expect(classifyTier(60 * 60_000)).toBe('idle');
    expect(classifyTier(99 * 60_000)).toBe('idle');
  });
});

describe('activityToRecentEvent', () => {
  it('parses JSON metadata when present', () => {
    const now = 1_700_000_000_000;
    const ev = activityToRecentEvent(
      { uidHash: 'u', action: 'card.bio.expand', targetType: null, metadata: '{"tid":"x"}', durationMs: 1500, createdAtMs: now - 5000 },
      now,
    );
    expect(ev.evt).toBe('card.bio.expand');
    expect(ev.ageMs).toBe(5000);
    expect((ev.payload as { tid?: string; dwellMs?: number }).tid).toBe('x');
    expect((ev.payload as { dwellMs?: number }).dwellMs).toBe(1500);
  });
  it('falls back to dwellMs from durationMs when no metadata', () => {
    const now = 1_700_000_000_000;
    const ev = activityToRecentEvent(
      { uidHash: 'u', action: 'card.impression.100', targetType: null, metadata: null, durationMs: 2200, createdAtMs: now - 1000 },
      now,
    );
    expect((ev.payload as { dwellMs?: number }).dwellMs).toBe(2200);
  });
  it('tolerates malformed JSON', () => {
    const now = 1_700_000_000_000;
    const ev = activityToRecentEvent(
      { uidHash: 'u', action: 'click', targetType: null, metadata: 'not-json', durationMs: null, createdAtMs: now },
      now,
    );
    expect(ev.payload).toBeUndefined();
  });
  it('clamps negative ageMs to 0', () => {
    const now = 1_700_000_000_000;
    const ev = activityToRecentEvent(
      { uidHash: 'u', action: 'x', targetType: null, metadata: null, durationMs: null, createdAtMs: now + 5000 },
      now,
    );
    expect(ev.ageMs).toBe(0);
  });
});

describe('buildViewerFeatures', () => {
  it('reads chronotype + attentionProfile from snapshot', () => {
    const vf = buildViewerFeatures(
      { uidHash: 'u', chronotype: 'night', attentionProfile: 'laser', rageClickRate: null, raw: { lastSessionWindowShopping: true } },
      [],
    );
    expect(vf.chronotype).toBe('night');
    expect(vf.attentionProfile).toBe('laser');
    expect(vf.lastSessionWindowShopping).toBe(true);
  });
  it('returns sensible defaults when snapshot is null', () => {
    const vf = buildViewerFeatures(null, []);
    expect(vf.chronotype).toBeUndefined();
    expect(vf.lastSessionWindowShopping).toBe(false);
  });
});

describe('buildMoodInput', () => {
  it('counts regrets, returns, bio-expands, and computes dwell variance', () => {
    const now = 1_700_000_000_000;
    const events = [
      { evt: 'swipe.regret', payload: {}, ageMs: 1000 },
      { evt: 'discover.see_later.view', payload: {}, ageMs: 2000 },
      { evt: 'card.bio.expand', payload: {}, ageMs: 3000 },
      { evt: 'card.impression.100', payload: { dwellMs: 1000 }, ageMs: 4000 },
      { evt: 'card.impression.100', payload: { dwellMs: 5000 }, ageMs: 5000 },
    ];
    const m = buildMoodInput(null, events, now);
    expect(m.recentRegretCount).toBe(1);
    expect(m.recentReturnCount).toBe(1);
    expect(m.bioExpandRate).toBeGreaterThan(0);
    expect(m.dwellVariance).not.toBeNull();
    expect(m.dwellVariance!).toBeGreaterThan(0);
  });
  it('reads rageClickRate from snapshot', () => {
    const m = buildMoodInput(
      { uidHash: 'u', chronotype: null, attentionProfile: null, rageClickRate: 0.2, raw: {} },
      [], 1_700_000_000_000,
    );
    expect(m.rageClickRate).toBe(0.2);
  });
  it('returns null dwellVariance when <2 dwell samples', () => {
    const m = buildMoodInput(null, [
      { evt: 'card.impression.100', payload: { dwellMs: 1000 }, ageMs: 1 },
    ], 1_700_000_000_000);
    expect(m.dwellVariance).toBeNull();
  });
});

describe('buildRawPatch', () => {
  it('always includes intentRightNow with TTL and topClass', () => {
    const intentVec = Object.fromEntries(ALL_INTENT_CLASSES.map((k) => [k, 1 / 7])) as ReturnType<typeof buildRawPatch>['intentRightNow'] extends infer X ? never : never; // type-only widening
    const patch = buildRawPatch({
      intentVec: Object.fromEntries(ALL_INTENT_CLASSES.map((k) => [k, 1 / 7])) as never,
      topClass: 'casual_scroll',
      moodVec: null,
      nowMs: 1234,
    });
    const ir = patch.intentRightNow as { ttlMs: number; topClass: string; computedAt: number };
    expect(ir.ttlMs).toBe(90_000);
    expect(ir.topClass).toBe('casual_scroll');
    expect(ir.computedAt).toBe(1234);
    expect(patch.moodRightNow).toBeUndefined();
    void intentVec;
  });
  it('omits moodRightNow when moodVec is null', () => {
    const patch = buildRawPatch({
      intentVec: Object.fromEntries(ALL_INTENT_CLASSES.map((k) => [k, 1 / 7])) as never,
      topClass: 'casual_scroll', moodVec: null, nowMs: 1,
    });
    expect('moodRightNow' in patch).toBe(false);
  });
  it('includes moodRightNow when moodVec is provided', () => {
    const patch = buildRawPatch({
      intentVec: Object.fromEntries(ALL_INTENT_CLASSES.map((k) => [k, 1 / 7])) as never,
      topClass: 'casual_scroll',
      moodVec: { rage: 0.1, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.1 },
      nowMs: 99,
    });
    expect(patch.moodRightNow).toBeDefined();
    expect((patch.moodRightNow as { ttlMs: number }).ttlMs).toBe(90_000);
  });
});

// ─── Counter ─────────────────────────────────────────────────────────────────

describe('Counter', () => {
  it('increments and resets', () => {
    const c = new Counter('x');
    c.inc(); c.inc(2);
    expect(c.value()).toBe(3);
    c.reset();
    expect(c.value()).toBe(0);
  });
});

// ─── Loop lifecycle ──────────────────────────────────────────────────────────

describe('IntentInferenceLoop start/stop', () => {
  it('does not start when enabled=false', () => {
    const { prisma } = buildMockPrisma({ candidates: [] });
    const loop = new IntentInferenceLoop(prisma, { enabled: false });
    loop.start();
    expect(loop.status().running).toBe(false);
    loop.stop();
  });
  it('starts when enabled=true and stop() halts the timer', () => {
    const { prisma } = buildMockPrisma({ candidates: [] });
    const loop = new IntentInferenceLoop(prisma, { enabled: true });
    loop.start();
    expect(loop.status().running).toBe(true);
    loop.stop();
    expect(loop.status().running).toBe(false);
  });
  it('respects INTENT_INFERENCE_ENABLED default-off env when no opts given', () => {
    const prev = process.env.INTENT_INFERENCE_ENABLED;
    delete process.env.INTENT_INFERENCE_ENABLED;
    const { prisma } = buildMockPrisma({ candidates: [] });
    const loop = new IntentInferenceLoop(prisma);
    loop.start();
    expect(loop.status().running).toBe(false);
    loop.stop();
    if (prev !== undefined) process.env.INTENT_INFERENCE_ENABLED = prev;
  });
});

// ─── Tick semantics ──────────────────────────────────────────────────────────

describe('IntentInferenceLoop.tick — consent gates', () => {
  it('writes intent but NOT mood when moodInferenceEnabled=false', async () => {
    const now = 1_700_000_000_000;
    const userId = 'user-mood-off';
    const uidHash = hashUid(userId);
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 5000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'card.impression.100', 1000, now, { durationMs: 2000 })] },
      settings: [{ userId, moodInferenceEnabled: false, behavioralRankingEnabled: true }],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    const wrote = await loop.tick();
    expect(wrote).toBe(1);
    const raw = mock.fsByUid[uidHash].raw;
    expect(raw.intentRightNow).toBeDefined();
    expect(raw.moodRightNow).toBeUndefined();
  });

  it('skips user entirely when behavioralRankingEnabled=false', async () => {
    const now = 1_700_000_000_000;
    const userId = 'user-no-rank';
    const uidHash = hashUid(userId);
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 5000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'click', 1000, now)] },
      settings: [{ userId, moodInferenceEnabled: true, behavioralRankingEnabled: false }],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    const wrote = await loop.tick();
    expect(wrote).toBe(0);
    expect(mock.fsByUid[uidHash]).toBeUndefined();
    expect(counters.skippedConsent.value()).toBe(1);
  });

  it('writes both intent and mood for users with default consent (no Settings row)', async () => {
    const now = 1_700_000_000_000;
    const uidHash = hashUid('opaque-user');
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 5000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'card.impression.100', 1000, now, { durationMs: 2000 })] },
      settings: [],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    await loop.tick();
    const raw = mock.fsByUid[uidHash].raw;
    expect(raw.intentRightNow).toBeDefined();
    expect(raw.moodRightNow).toBeDefined();
  });
});

describe('IntentInferenceLoop.tick — JSONB merge', () => {
  it('preserves existing FeatureSnapshot.raw keys when writing', async () => {
    const now = 1_700_000_000_000;
    const userId = 'user-existing-raw';
    const uidHash = hashUid(userId);
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 5000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'card.impression.100', 1000, now)] },
      settings: [{ userId, moodInferenceEnabled: true, behavioralRankingEnabled: true }],
      initialFeatureSnapshot: {
        [uidHash]: {
          uidHash,
          chronotype: 'night',
          attentionProfile: 'reader',
          rageClickRate: 0.05,
          raw: {
            dwellHistogram: [0.1, 0.2, 0.3, 0.2, 0.2],
            hesitationP50Ms: 1234,
            customKey: { keepMe: true },
          },
        },
      },
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    await loop.tick();
    const raw = mock.fsByUid[uidHash].raw;
    expect(raw.dwellHistogram).toEqual([0.1, 0.2, 0.3, 0.2, 0.2]);
    expect(raw.hesitationP50Ms).toBe(1234);
    expect((raw.customKey as { keepMe: boolean }).keepMe).toBe(true);
    expect(raw.intentRightNow).toBeDefined();
    expect(raw.moodRightNow).toBeDefined();
  });
});

describe('IntentInferenceLoop.tick — batching', () => {
  it('caps work at MAX_USERS_PER_TICK', async () => {
    const now = 1_700_000_000_000;
    const N = MAX_USERS_PER_TICK + 25;
    const candidates = Array.from({ length: N }, (_, i) => ({
      uidHash: hashUid(`bulk-user-${i}`),
      lastActivityAtMs: now - 1000,
    }));
    const activitiesByUid: Record<string, ActRow[]> = {};
    for (const c of candidates) activitiesByUid[c.uidHash] = [actRow(c.uidHash, 'click', 100, now)];
    const mock = buildMockPrisma({ candidates, activitiesByUid, settings: [] });
    // Force the candidate query to honour LIMIT semantics for realism:
    // we already slice candidates to MAX in the real query, but the mock
    // returns the full list. Asserting `wrote <= MAX` proves the per-tick
    // cap inside the loop body holds.
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    const wrote = await loop.tick();
    expect(wrote).toBeLessThanOrEqual(MAX_USERS_PER_TICK);
  });

  it('skips idle users (>=1h ago)', async () => {
    const now = 1_700_000_000_000;
    const uidHash = hashUid('idle-user');
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 2 * 60 * 60_000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'click', 5, now)] },
      settings: [],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    const wrote = await loop.tick();
    expect(wrote).toBe(0);
  });
});

describe('IntentInferenceLoop.tick — counters and errors', () => {
  it('increments runs every tick and writes for each successful user', async () => {
    const now = 1_700_000_000_000;
    const uidA = hashUid('a-user'); const uidB = hashUid('b-user');
    const mock = buildMockPrisma({
      candidates: [
        { uidHash: uidA, lastActivityAtMs: now - 5000 },
        { uidHash: uidB, lastActivityAtMs: now - 6000 },
      ],
      activitiesByUid: {
        [uidA]: [actRow(uidA, 'click', 100, now)],
        [uidB]: [actRow(uidB, 'click', 100, now)],
      },
      settings: [],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    await loop.tick();
    expect(counters.runs.value()).toBe(1);
    expect(counters.writes.value()).toBe(2);
  });

  it('per-user errors do not throw out of the loop', async () => {
    const now = 1_700_000_000_000;
    const uidHash = hashUid('boom');
    // Build a prisma that throws on the activity-fetch query.
    const prisma = {
      $queryRawUnsafe: async (sql: string, ..._params: unknown[]): Promise<unknown> => {
        const norm = sql.replace(/\s+/g, ' ').toUpperCase();
        if (norm.includes('FROM "USERACTIVITY"') && norm.includes('GROUP BY')) {
          return [{ uidHash, lastActivityAt: new Date(now - 5000) }];
        }
        if (norm.includes('FROM "SETTINGS"')) return [];
        if (norm.includes('FROM "USERACTIVITY"')) throw new Error('boom');
        return [];
      },
      $executeRawUnsafe: async () => 0,
    } as unknown as ConstructorParameters<typeof IntentInferenceLoop>[0];
    const loop = new IntentInferenceLoop(prisma, { enabled: true, now: () => now });
    await expect(loop.tick()).resolves.toBeGreaterThanOrEqual(0);
    expect(counters.errors.value()).toBeGreaterThan(0);
  });
});

describe('IntentInferenceLoop.tick — recent-tier rate limit', () => {
  it('does not re-process a recent-tier user within RECENT_TICK_MS', async () => {
    // Recent tier = ageMs in [2min, 1h). Two ticks back-to-back at the same
    // simulated time should process the user once.
    const now = 1_700_000_000_000;
    const userId = 'user-recent';
    const uidHash = hashUid(userId);
    const mock = buildMockPrisma({
      candidates: [{ uidHash, lastActivityAtMs: now - 5 * 60_000 }],
      activitiesByUid: { [uidHash]: [actRow(uidHash, 'click', 100, now)] },
      settings: [],
    });
    const loop = new IntentInferenceLoop(mock.prisma, { enabled: true, now: () => now });
    const first = await loop.tick();
    const second = await loop.tick();
    expect(first).toBe(1);
    expect(second).toBe(0);
  });
});

describe('IntentInferenceLoop.status', () => {
  it('returns enabled+running flags and counter snapshots', () => {
    const { prisma } = buildMockPrisma({ candidates: [] });
    const loop = new IntentInferenceLoop(prisma, { enabled: true });
    const s = loop.status();
    expect(s.enabled).toBe(true);
    expect(s.intervalMs).toBeGreaterThan(0);
    expect(s.counters).toBeDefined();
  });
});
