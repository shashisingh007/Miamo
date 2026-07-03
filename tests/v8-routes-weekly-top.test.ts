/**
 * v3.6.0 Weekly Top-10 endpoint — read-only, flag-gated, pure unit tests.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashUid } from '../services/shared/src/track/hash';

interface WeeklyRow { uidHash: string; weekIso: string; rank: number; targetHash: string; computedAt: Date }

function currentWeekIso(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}W${String(weekNum).padStart(2, '0')}`;
}

function handler(rows: WeeklyRow[], userId: string): { status: number; body: any } {
  if (process.env.FEATURE_WEEKLY_TOP_ENABLED !== '1') return { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
  if (!userId) return { status: 401, body: { error: { message: 'Unauthorized' } } };
  const uidHash = hashUid(userId);
  const weekIso = currentWeekIso();
  const out = rows.filter((r) => r.uidHash === uidHash && r.weekIso === weekIso).sort((a, b) => a.rank - b.rank);
  if (out.length === 0) return { status: 200, body: { data: [], weekIso, generatedAt: null } };
  return { status: 200, body: { data: out, weekIso, generatedAt: out[0].computedAt } };
}

describe('v3.6.0 weekly-top route logic', () => {
  beforeEach(() => { delete process.env.FEATURE_WEEKLY_TOP_ENABLED; });
  afterEach(() => { delete process.env.FEATURE_WEEKLY_TOP_ENABLED; });

  it('flag OFF → returns 404', () => {
    const r = handler([], 'u1');
    expect(r.status).toBe(404);
  });

  it('flag ON + no rows → returns empty data array', () => {
    process.env.FEATURE_WEEKLY_TOP_ENABLED = '1';
    const r = handler([], 'u1');
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([]);
    expect(r.body.weekIso).toMatch(/^\d{4}W\d{2}$/);
    expect(r.body.generatedAt).toBeNull();
  });

  it('flag ON + populated → returns rows sorted by rank', () => {
    process.env.FEATURE_WEEKLY_TOP_ENABLED = '1';
    const uid = 'u1';
    const hash = hashUid(uid);
    const week = currentWeekIso();
    const now = new Date();
    const rows: WeeklyRow[] = [
      { uidHash: hash, weekIso: week, rank: 3, targetHash: 'tC', computedAt: now },
      { uidHash: hash, weekIso: week, rank: 1, targetHash: 'tA', computedAt: now },
      { uidHash: hash, weekIso: week, rank: 2, targetHash: 'tB', computedAt: now },
    ];
    const r = handler(rows, uid);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(3);
    expect(r.body.data[0].rank).toBe(1);
    expect(r.body.data[2].rank).toBe(3);
  });

  it('rows from other users are not leaked', () => {
    process.env.FEATURE_WEEKLY_TOP_ENABLED = '1';
    const week = currentWeekIso();
    const rows: WeeklyRow[] = [
      { uidHash: hashUid('other'), weekIso: week, rank: 1, targetHash: 'x', computedAt: new Date() },
    ];
    const r = handler(rows, 'me');
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([]);
  });

  it('currentWeekIso format is YYYYWww', () => {
    expect(currentWeekIso(new Date('2026-01-05T00:00:00Z'))).toMatch(/^\d{4}W\d{2}$/);
    expect(currentWeekIso(new Date('2026-12-30T00:00:00Z'))).toMatch(/^\d{4}W\d{2}$/);
  });

  it('only current weekIso rows are returned', () => {
    process.env.FEATURE_WEEKLY_TOP_ENABLED = '1';
    const uid = 'u1';
    const hash = hashUid(uid);
    const rows: WeeklyRow[] = [
      { uidHash: hash, weekIso: '2020W01', rank: 1, targetHash: 'stale', computedAt: new Date('2020-01-01') },
    ];
    const r = handler(rows, uid);
    expect(r.body.data).toEqual([]);
  });
});
