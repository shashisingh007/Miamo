/**
 * v8 (v3.6.0) — server-side event emitters.
 *
 * Validates that `emitServerEvent` writes a `UserActivity` row only when
 * the payload passes the strict V6_VALIDATORS schema. The four v8 events
 * we wire server-side are:
 *
 *   - `move.composed`               from content/server.ts (Move v2 route)
 *   - `move.suggestion_accepted`    from messaging/server.ts (ratifier)
 *   - `exposure.credit_earned`      from tracking-worker/exposureScheduler.ts
 *   - `exposure.slot_filled`        from social/server.ts (discover route)
 *
 * We don't boot the express services here — the emit utility is a thin
 * boundary and its contract (validate, then write to UserActivity) is
 * what matters. We mock Prisma's `userActivity.create` and assert what
 * lands there. The validator itself is covered exhaustively in
 * services/shared/src/track/__tests__/v8Validators.test.ts; here we
 * verify the emitter wires the schema in correctly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emitServerEvent } from '../services/shared/src/track/serverEmit';

const HASH22 = 'a1b2c3d4e5f6g7h8i9j0kl';

type FakeCreateArgs = { data: Record<string, unknown> };
const created: FakeCreateArgs[] = [];

const mockPrisma = {
  userActivity: {
    create: vi.fn((args: FakeCreateArgs) => {
      created.push(args);
      return Promise.resolve({ id: 'fake', ...args.data });
    }),
  },
} as any;

beforeEach(() => {
  created.length = 0;
  mockPrisma.userActivity.create.mockClear();
});

// ─── move.composed (content service) ────────────────────────────────
describe('emitServerEvent — move.composed', () => {
  it('writes a UserActivity row for a valid payload', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.composed', {
      receiverHash: HASH22,
      suggestionCount: 5,
      fallbackCount: 0,
      hookCategories: ['recent_post', 'shared_interest'],
      languageFamily: 'en',
    }, 'creativity-item-id');
    expect(created.length).toBe(1);
    const row = created[0].data;
    expect(row.userId).toBe('sender-id');
    expect(row.action).toBe('move.composed');
    expect(row.targetType).toBe('event');
    expect(row.targetId).toBe('creativity-item-id');
    const meta = JSON.parse(row.metadata as string);
    expect(meta.receiverHash).toBe(HASH22);
    expect(meta.suggestionCount).toBe(5);
  });

  it('drops on invalid receiverHash (too short)', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.composed', {
      receiverHash: 'too-short',
      suggestionCount: 5,
      fallbackCount: 0,
      hookCategories: ['recent_post'],
      languageFamily: 'en',
    });
    expect(created.length).toBe(0);
  });

  it('drops on invalid languageFamily', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.composed', {
      receiverHash: HASH22,
      suggestionCount: 1,
      fallbackCount: 0,
      hookCategories: [],
      languageFamily: 'pt_br', // not in enum
    });
    expect(created.length).toBe(0);
  });
});

// ─── move.suggestion_accepted (messaging service) ───────────────────
describe('emitServerEvent — move.suggestion_accepted', () => {
  it('writes a UserActivity row for a valid payload', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.suggestion_accepted', {
      receiverHash: HASH22,
      slotIndex: 2,
      hookCategory: 'shared_interest',
      tone: 'reflective',
    }, 'chat-id');
    expect(created.length).toBe(1);
    expect(created[0].data.action).toBe('move.suggestion_accepted');
  });

  it('rejects slotIndex > 4 (only 5 suggestion slots)', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.suggestion_accepted', {
      receiverHash: HASH22,
      slotIndex: 5,
      hookCategory: 'shared_interest',
      tone: 'casual',
    });
    expect(created.length).toBe(0);
  });

  it('rejects unknown tone', () => {
    emitServerEvent(mockPrisma, 'sender-id', 'move.suggestion_accepted', {
      receiverHash: HASH22,
      slotIndex: 0,
      hookCategory: 'shared_interest',
      tone: 'sarcastic' as any,
    });
    expect(created.length).toBe(0);
  });
});

// ─── exposure.credit_earned (tracking-worker) ────────────────────────
describe('emitServerEvent — exposure.credit_earned', () => {
  it('writes a UserActivity row for a valid payload', () => {
    emitServerEvent(mockPrisma, 'user-id', 'exposure.credit_earned', {
      surface: 'discover',
      reason: 'sticky_like',
      slots: 1,
    }, 'ua:row-id');
    expect(created.length).toBe(1);
    const row = created[0].data;
    expect(row.action).toBe('exposure.credit_earned');
    expect(row.targetId).toBe('ua:row-id');
  });

  it('rejects slots < 1 (the schema requires ≥ 1)', () => {
    emitServerEvent(mockPrisma, 'user-id', 'exposure.credit_earned', {
      surface: 'discover',
      reason: 'rage_like_zero',
      slots: 0,
    });
    expect(created.length).toBe(0);
  });

  it('rejects unknown surface', () => {
    emitServerEvent(mockPrisma, 'user-id', 'exposure.credit_earned', {
      surface: 'creativity' as any,
      reason: 'sticky_like',
      slots: 1,
    });
    expect(created.length).toBe(0);
  });
});

// ─── exposure.slot_filled (social discover route) ────────────────────
describe('emitServerEvent — exposure.slot_filled', () => {
  it('writes one row per slot type for a valid payload', () => {
    const slotTypes = ['organic', 'fairness_inject', 'top10', 'premium_boost'] as const;
    for (const slotType of slotTypes) {
      emitServerEvent(mockPrisma, 'requester-id', 'exposure.slot_filled', {
        surface: 'discover',
        targetHash: HASH22,
        slotType,
      }, `target-${slotType}`);
    }
    expect(created.length).toBe(4);
    const actions = new Set(created.map((c) => c.data.action));
    expect(actions).toEqual(new Set(['exposure.slot_filled']));
    const targetHashes = created.map((c) => JSON.parse(c.data.metadata as string).targetHash);
    expect(targetHashes.every((h) => h === HASH22)).toBe(true);
  });

  it('rejects unknown slotType', () => {
    emitServerEvent(mockPrisma, 'requester-id', 'exposure.slot_filled', {
      surface: 'discover',
      targetHash: HASH22,
      slotType: 'sponsored' as any,
    });
    expect(created.length).toBe(0);
  });

  it('rejects bad targetHash length', () => {
    emitServerEvent(mockPrisma, 'requester-id', 'exposure.slot_filled', {
      surface: 'discover',
      targetHash: 'abc',
      slotType: 'organic',
    });
    expect(created.length).toBe(0);
  });
});

// ─── boundary cases ─────────────────────────────────────────────────
describe('emitServerEvent — boundary', () => {
  it('silently swallows Prisma write failures', async () => {
    const failingPrisma = {
      userActivity: {
        create: vi.fn(() => Promise.reject(new Error('db down'))),
      },
    } as any;
    // The function does not throw — it returns void and logs.
    expect(() => emitServerEvent(failingPrisma, 'u', 'move.composed', {
      receiverHash: HASH22,
      suggestionCount: 1,
      fallbackCount: 0,
      hookCategories: ['shared_interest'],
      languageFamily: 'en',
    })).not.toThrow();
    // Give the promise a tick to reject without bubbling.
    await new Promise((r) => setTimeout(r, 0));
    expect(failingPrisma.userActivity.create).toHaveBeenCalledOnce();
  });

  it('rejects an unknown event name without calling create', () => {
    emitServerEvent(mockPrisma, 'u', 'totally.fake' as any, { foo: 'bar' });
    expect(created.length).toBe(0);
    expect(mockPrisma.userActivity.create).not.toHaveBeenCalled();
  });
});
