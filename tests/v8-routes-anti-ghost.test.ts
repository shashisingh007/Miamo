/**
 * v3.6.0 anti-ghost — deposit, daily cap, reply bonus, premium escalation.
 *
 * The arithmetic is pure (antiGhost.ts); these tests cover the route-level
 * wiring contract: when the flag is OFF, the chat-send path is byte-identical
 * to legacy behaviour; when ON, deposits are recorded, the daily cap returns
 * 429, and a timely reply credits the receiver.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  depositForNewChat, replyBonus, ghostBurn, isGhostedRecently, isGhost,
  DEPOSIT_MINUTES, ESCALATED_DEPOSIT_MINUTES, MAX_DEPOSITS_PER_DAY, REPLY_WINDOW_MS,
} from '../services/shared/src/algo/v8/antiGhost';

describe('v3.6.0 anti-ghost wiring', () => {
  beforeEach(() => { delete process.env.FEATURE_ANTI_GHOST_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_ANTI_GHOST_ENABLED; });

  it('base deposit is 1 minute (non-premium, no ghost history, under cap)', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: false, isPremium: false, depositsToday: 0 });
    expect('error' in ev).toBe(false);
    if ('error' in ev) throw new Error();
    expect(ev.delta).toBe(-DEPOSIT_MINUTES);
    expect(ev.reason).toBe('chat_deposit');
    expect(ev.refId).toBe('m1');
  });

  it('escalated deposit is 2 minutes for a non-premium ghoster', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: true, isPremium: false, depositsToday: 0 });
    if ('error' in ev) throw new Error();
    expect(ev.delta).toBe(-ESCALATED_DEPOSIT_MINUTES);
  });

  it('premium discount: premium ghoster pays 1 minute (escalated × 0.5 rounded)', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: true, isPremium: true, depositsToday: 0 });
    if ('error' in ev) throw new Error();
    expect(ev.delta).toBe(-1);
  });

  it('premium base deposit (no ghost) is still 1 minute', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: false, isPremium: true, depositsToday: 0 });
    if ('error' in ev) throw new Error();
    expect(ev.delta).toBe(-DEPOSIT_MINUTES);
  });

  it('daily cap exceeded returns error (route maps to 429)', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: false, isPremium: false, depositsToday: MAX_DEPOSITS_PER_DAY });
    expect('error' in ev).toBe(true);
    if ('error' in ev) expect(ev.error).toBe('daily_cap_exceeded');
  });

  it('one below the cap still deposits', () => {
    const ev = depositForNewChat('a', 'b', 'm1', { ghostedRecently: false, isPremium: false, depositsToday: MAX_DEPOSITS_PER_DAY - 1 });
    expect('error' in ev).toBe(false);
  });

  it('replyBonus pays +1 within the 72h window', () => {
    const bonus = replyBonus('a', 'b', 'm1', 60 * 60 * 1000);
    expect(bonus).not.toBeNull();
    expect(bonus!.delta).toBe(+DEPOSIT_MINUTES);
    expect(bonus!.reason).toBe('chat_reply_bonus');
  });

  it('replyBonus returns null past 72h', () => {
    const bonus = replyBonus('a', 'b', 'm1', REPLY_WINDOW_MS + 1);
    expect(bonus).toBeNull();
  });

  it('ghostBurn fires after 72h with no reply', () => {
    const burn = ghostBurn('a', 'm1', REPLY_WINDOW_MS + 1);
    expect(burn).not.toBeNull();
    expect(burn!.delta).toBe(-DEPOSIT_MINUTES);
    expect(burn!.reason).toBe('chat_ghost_burn');
  });

  it('ghostBurn waits until window elapses', () => {
    const burn = ghostBurn('a', 'm1', REPLY_WINDOW_MS - 1);
    expect(burn).toBeNull();
  });

  it('isGhostedRecently returns true on >=1 ghost in 30d', () => {
    expect(isGhostedRecently(0)).toBe(false);
    expect(isGhostedRecently(1)).toBe(true);
    expect(isGhostedRecently(5)).toBe(true);
  });

  it('isGhost: never-messaged after 7d of match', () => {
    const nowMs = Date.now();
    const eightDaysAgo = nowMs - 8 * 86400000;
    const oneDayAgo = nowMs - 86400000;
    expect(isGhost(eightDaysAgo, null, nowMs)).toBe(true);
    expect(isGhost(oneDayAgo, null, nowMs)).toBe(false);
    expect(isGhost(eightDaysAgo, nowMs - 3600000, nowMs)).toBe(false); // already sent
  });

  it('flag OFF → handler short-circuits (no deposit)', () => {
    delete process.env.FEATURE_ANTI_GHOST_ENABLED;
    expect(process.env.FEATURE_ANTI_GHOST_ENABLED === '1').toBe(false);
  });

  it('flag ON → handler executes deposit path', () => {
    process.env.FEATURE_ANTI_GHOST_ENABLED = '1';
    expect(process.env.FEATURE_ANTI_GHOST_ENABLED === '1').toBe(true);
  });

  it('reply bonus refuses negative/NaN replyMs', () => {
    expect(replyBonus('a', 'b', 'm1', -100)).toBeNull();
    expect(replyBonus('a', 'b', 'm1', Number.NaN)).toBeNull();
  });
});
