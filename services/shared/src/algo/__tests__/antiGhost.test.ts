import { describe, it, expect } from 'vitest';
import {
  depositForNewChat,
  replyBonus,
  ghostBurn,
  isGhostedRecently,
  isGhost,
  ghostPenaltyClearedBy,
  DEPOSIT_MINUTES,
  ESCALATED_DEPOSIT_MINUTES,
  REPLY_WINDOW_MS,
  MAX_DEPOSITS_PER_DAY,
  GHOST_DETECTION_WINDOW_DAYS,
  SUCCESSFUL_CONVERSATION_REPLY_ROUNDS,
} from '../v8/antiGhost';

const SENDER = 'sender_u1';
const RECEIVER = 'receiver_u2';
const MATCH = 'match_abc';

function isError(x: unknown): x is { error: 'daily_cap_exceeded' } {
  return typeof x === 'object' && x !== null && 'error' in (x as Record<string, unknown>);
}

describe('antiGhost — depositForNewChat', () => {
  it('non-premium new user pays 1 minute', () => {
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: false,
      isPremium: false,
      depositsToday: 0,
    });
    expect(isError(ev)).toBe(false);
    if (isError(ev)) return;
    expect(ev.reason).toBe('chat_deposit');
    expect(ev.delta).toBe(-DEPOSIT_MINUTES);
    expect(ev.delta).toBe(-1);
    expect(ev.refId).toBe(MATCH);
  });

  it('premium pays the same 1 minute on first chat (integer ledger)', () => {
    // Premium discount only applies to the escalated tier; first-chat deposit
    // stays at 1 min so the ledger remains integer-valued.
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: false,
      isPremium: true,
      depositsToday: 0,
    });
    expect(isError(ev)).toBe(false);
    if (isError(ev)) return;
    expect(ev.delta).toBe(-1);
  });

  it('non-premium penalised user pays 2 minutes (escalated tier)', () => {
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: true,
      isPremium: false,
      depositsToday: 0,
    });
    expect(isError(ev)).toBe(false);
    if (isError(ev)) return;
    expect(ev.delta).toBe(-ESCALATED_DEPOSIT_MINUTES);
    expect(ev.delta).toBe(-2);
  });

  it('premium penalised user pays 1 minute (half of escalated, integer)', () => {
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: true,
      isPremium: true,
      depositsToday: 0,
    });
    expect(isError(ev)).toBe(false);
    if (isError(ev)) return;
    expect(ev.delta).toBe(-1);
  });

  it('11th deposit of the day returns daily_cap_exceeded', () => {
    expect(MAX_DEPOSITS_PER_DAY).toBe(10);
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: false,
      isPremium: false,
      depositsToday: 10,
    });
    expect(isError(ev)).toBe(true);
    if (!isError(ev)) return;
    expect(ev.error).toBe('daily_cap_exceeded');
  });

  it('10th deposit (depositsToday=9) still succeeds', () => {
    const ev = depositForNewChat(SENDER, RECEIVER, MATCH, {
      ghostedRecently: false,
      isPremium: false,
      depositsToday: 9,
    });
    expect(isError(ev)).toBe(false);
  });
});

describe('antiGhost — replyBonus', () => {
  it('reply within 72h returns +1 bonus', () => {
    const ev = replyBonus(SENDER, RECEIVER, MATCH, 30 * 60 * 60 * 1000); // 30h
    expect(ev).not.toBeNull();
    expect(ev?.reason).toBe('chat_reply_bonus');
    expect(ev?.delta).toBe(+1);
    expect(ev?.refId).toBe(MATCH);
  });

  it('reply right at 72h boundary returns bonus', () => {
    const ev = replyBonus(SENDER, RECEIVER, MATCH, REPLY_WINDOW_MS);
    expect(ev).not.toBeNull();
    expect(ev?.delta).toBe(+1);
  });

  it('reply at 73h returns null (window expired)', () => {
    const ev = replyBonus(SENDER, RECEIVER, MATCH, REPLY_WINDOW_MS + 60 * 60 * 1000);
    expect(ev).toBeNull();
  });

  it('negative replyMs returns null (caller bug guard)', () => {
    const ev = replyBonus(SENDER, RECEIVER, MATCH, -100);
    expect(ev).toBeNull();
  });

  it('reply within 1 minute returns bonus', () => {
    const ev = replyBonus(SENDER, RECEIVER, MATCH, 60_000);
    expect(ev?.delta).toBe(+1);
  });
});

describe('antiGhost — ghostBurn', () => {
  it('age below window returns null (still in escrow)', () => {
    const ev = ghostBurn(SENDER, MATCH, REPLY_WINDOW_MS - 1);
    expect(ev).toBeNull();
  });

  it('age at exactly 72h burns 1 minute', () => {
    const ev = ghostBurn(SENDER, MATCH, REPLY_WINDOW_MS);
    expect(ev).not.toBeNull();
    expect(ev?.reason).toBe('chat_ghost_burn');
    expect(ev?.delta).toBe(-1);
    expect(ev?.refId).toBe(MATCH);
  });

  it('age past 72h (e.g. 73h) burns 1 minute', () => {
    const ev = ghostBurn(SENDER, MATCH, REPLY_WINDOW_MS + 60 * 60 * 1000);
    expect(ev?.delta).toBe(-1);
  });
});

describe('antiGhost — isGhostedRecently', () => {
  it('0 ghost events → false', () => {
    expect(isGhostedRecently(0)).toBe(false);
  });
  it('1 ghost event → true', () => {
    expect(isGhostedRecently(1)).toBe(true);
  });
  it('many ghost events → true', () => {
    expect(isGhostedRecently(5)).toBe(true);
  });
});

describe('antiGhost — isGhost (post-match follow-up)', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const matchedAt = Date.UTC(2026, 5, 1);

  it('within 7d window, never messaged → not ghost yet', () => {
    expect(isGhost(matchedAt, null, matchedAt + 3 * MS_PER_DAY)).toBe(false);
  });

  it('past 7d window, never messaged → ghost', () => {
    expect(GHOST_DETECTION_WINDOW_DAYS).toBe(7);
    expect(isGhost(matchedAt, null, matchedAt + 8 * MS_PER_DAY)).toBe(true);
  });

  it('past 7d window but did message → not ghost', () => {
    const sentAt = matchedAt + 2 * MS_PER_DAY;
    expect(isGhost(matchedAt, sentAt, matchedAt + 8 * MS_PER_DAY)).toBe(false);
  });
});

describe('antiGhost — ghostPenaltyClearedBy', () => {
  it('clears after 3 reply rounds', () => {
    expect(SUCCESSFUL_CONVERSATION_REPLY_ROUNDS).toBe(3);
    expect(ghostPenaltyClearedBy(3)).toBe(true);
    expect(ghostPenaltyClearedBy(4)).toBe(true);
  });
  it('does not clear at 2 rounds', () => {
    expect(ghostPenaltyClearedBy(2)).toBe(false);
  });
});

describe('antiGhost — determinism & constants', () => {
  it('REPLY_WINDOW_MS equals 72 hours in ms', () => {
    expect(REPLY_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
  });

  it('same deposit input → same event twice', () => {
    const h = { ghostedRecently: false, isPremium: false, depositsToday: 0 };
    const a = depositForNewChat(SENDER, RECEIVER, MATCH, h);
    const b = depositForNewChat(SENDER, RECEIVER, MATCH, h);
    expect(a).toEqual(b);
  });
});
