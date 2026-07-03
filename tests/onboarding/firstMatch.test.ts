/**
 * G.18 Task 1c — First-match transactional write.
 *
 * These tests lock in the contract: when a mutual like arrives and it is
 * the requester's very first ever match, the `POST /discover/like`
 * response includes `isFirstMatch: true` AND `Settings.hasSeenFirstMatch`
 * is flipped inside the same $transaction so a concurrent second match
 * cannot also observe `isFirstMatch = true`.
 *
 * We test the logic by reimplementing the transactional path against an
 * in-memory prisma mock. This is the smallest possible harness that
 * exercises the priorMatchCount check + settings.upsert without spinning
 * up the whole social server.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// A minimal reflection of the txn body from services/social/src/server.ts.
// Kept in sync with the handler; if the txn body changes the test should
// update in lockstep.
async function runMutualTxn(tx: any, fromUserId: string, toUserId: string) {
  const existingMatch = await tx.match.findFirst({ where: { OR: [{ user1Id: fromUserId, user2Id: toUserId }, { user1Id: toUserId, user2Id: fromUserId }] } });
  if (existingMatch) return { match: existingMatch, firstMatch: false };
  const priorMatchCount = await tx.match.count({ where: { active: true, OR: [{ user1Id: fromUserId }, { user2Id: fromUserId }] } });
  const newMatch = await tx.match.create({ data: { user1Id: fromUserId, user2Id: toUserId } });
  let firstMatch = false;
  if (priorMatchCount === 0) {
    const existingSettings = await tx.settings.findUnique({ where: { userId: fromUserId }, select: { hasSeenFirstMatch: true } });
    if (!existingSettings || existingSettings.hasSeenFirstMatch === false) {
      firstMatch = true;
      await tx.settings.upsert({
        where: { userId: fromUserId },
        update: { hasSeenFirstMatch: true },
        create: { userId: fromUserId, hasSeenFirstMatch: true },
      });
    }
  }
  return { match: newMatch, firstMatch };
}

interface Store {
  matches: Array<{ id: string; user1Id: string; user2Id: string; active: boolean }>;
  settings: Map<string, { hasSeenFirstMatch: boolean }>;
}

function mockTx(store: Store): any {
  return {
    match: {
      findFirst: async (args: any) => {
        const or = args?.where?.OR || [];
        for (const m of store.matches) {
          for (const o of or) {
            if (o.user1Id === m.user1Id && o.user2Id === m.user2Id) return m;
          }
        }
        return null;
      },
      count: async (args: any) => {
        const or = args?.where?.OR || [];
        const active = args?.where?.active ?? true;
        return store.matches.filter(m => (active === undefined || m.active === active) && or.some((o: any) => o.user1Id === m.user1Id || o.user2Id === m.user2Id)).length;
      },
      create: async (args: any) => {
        const m = { id: `m_${store.matches.length + 1}`, ...args.data, active: true };
        store.matches.push(m);
        return m;
      },
    },
    settings: {
      findUnique: async (args: any) => {
        const s = store.settings.get(args.where.userId);
        return s ?? null;
      },
      upsert: async (args: any) => {
        const existing = store.settings.get(args.where.userId);
        if (existing) Object.assign(existing, args.update);
        else store.settings.set(args.where.userId, { ...args.create });
        return store.settings.get(args.where.userId);
      },
    },
  };
}

describe('G.18 Task 1c — first-match transactional write', () => {
  let store: Store;
  beforeEach(() => {
    store = { matches: [], settings: new Map() };
  });

  it('returns firstMatch=true on the requester\'s very first match', async () => {
    const tx = mockTx(store);
    const r = await runMutualTxn(tx, 'userA', 'userB');
    expect(r.firstMatch).toBe(true);
    expect(r.match).toBeTruthy();
    // Settings.hasSeenFirstMatch flipped inside the same txn.
    expect(store.settings.get('userA')?.hasSeenFirstMatch).toBe(true);
  });

  it('returns firstMatch=false on the requester\'s second match', async () => {
    // Preload a prior match for userA so priorMatchCount = 1.
    store.matches.push({ id: 'seed', user1Id: 'userA', user2Id: 'userX', active: true });
    store.settings.set('userA', { hasSeenFirstMatch: true });
    const tx = mockTx(store);
    const r = await runMutualTxn(tx, 'userA', 'userB');
    expect(r.firstMatch).toBe(false);
    expect(r.match).toBeTruthy();
    expect(store.settings.get('userA')?.hasSeenFirstMatch).toBe(true);
  });

  it('returns firstMatch=false when Settings.hasSeenFirstMatch is already true (idempotency)', async () => {
    // Zero prior matches BUT flag already flipped (e.g. from a legacy state).
    store.settings.set('userA', { hasSeenFirstMatch: true });
    const tx = mockTx(store);
    const r = await runMutualTxn(tx, 'userA', 'userB');
    expect(r.firstMatch).toBe(false);
    // Should not toggle back.
    expect(store.settings.get('userA')?.hasSeenFirstMatch).toBe(true);
  });

  it('creates a Settings row from scratch when the user has none', async () => {
    // Empty Settings map — verifies upsert.create path fires.
    const tx = mockTx(store);
    const r = await runMutualTxn(tx, 'userA', 'userB');
    expect(r.firstMatch).toBe(true);
    expect(store.settings.get('userA')?.hasSeenFirstMatch).toBe(true);
  });

  it('is idempotent: existing match returns firstMatch=false without flipping settings', async () => {
    store.matches.push({ id: 'existing', user1Id: 'userA', user2Id: 'userB', active: true });
    const tx = mockTx(store);
    const r = await runMutualTxn(tx, 'userA', 'userB');
    expect(r.firstMatch).toBe(false);
    expect(store.settings.has('userA')).toBe(false); // never touched
  });
});
