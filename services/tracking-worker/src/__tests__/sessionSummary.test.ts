import { describe, it, expect } from 'vitest';
import { _internals } from '../sessionSummary';

const { foldSessionsFromHourly } = _internals;

const u = 'uH';
function row(evtAndHour: { evt: string; hour: number; count?: number; durSum?: number; route?: string; sessionId?: string | null }) {
  return {
    uidHash: u,
    evt: evtAndHour.evt,
    bucket: new Date(Date.UTC(2026, 4, 31, evtAndHour.hour, 0, 0)),
    count: evtAndHour.count ?? 1,
    durSum: evtAndHour.durSum ?? 0,
    route: evtAndHour.route ?? null,
    sessionId: evtAndHour.sessionId ?? null,
  };
}

describe('foldSessionsFromHourly', () => {
  it('returns no sessions for empty input', () => {
    expect(foldSessionsFromHourly([])).toEqual([]);
  });

  it('groups contiguous hourly activity into one session', () => {
    const rows = [
      row({ evt: 'discover.card_view', hour: 10, count: 5 }),
      row({ evt: 'swipe.right',        hour: 10, count: 1 }),
      row({ evt: 'discover.card_view', hour: 11, count: 3 }),
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out).toHaveLength(1);
    expect(out[0].cardsViewed).toBe(8);
    expect(out[0].swipesRight).toBe(1);
  });

  it('splits sessions on a gap larger than idle threshold', () => {
    const rows = [
      row({ evt: 'discover.card_view', hour:  9, count: 2 }),
      row({ evt: 'discover.card_view', hour: 14, count: 4 }), // 5h gap
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out).toHaveLength(2);
  });

  it('respects explicit sessionId boundaries', () => {
    const rows = [
      row({ evt: 'discover.card_view', hour: 10, count: 2, sessionId: 's1' }),
      row({ evt: 'discover.card_view', hour: 10, count: 2, sessionId: 's2' }),
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out).toHaveLength(2);
    expect(out.find((s) => s.sessionId === 's1')).toBeDefined();
    expect(out.find((s) => s.sessionId === 's2')).toBeDefined();
  });

  it('flags zeroActionSession when no actions but duration > 30s', () => {
    // Activity = a single attention.idle row over 5 minutes — counts as
    // duration but no cards/swipes/msgs.
    const rows = [row({ evt: 'attention.idle', hour: 10, count: 1, durSum: 5 * 60 * 1000 })];
    const out = foldSessionsFromHourly(rows);
    expect(out[0].zeroActionSession).toBe(true);
    expect(out[0].idleMs).toBe(5 * 60 * 1000);
  });

  it('flags windowShopping when many cards but zero swipes', () => {
    const rows = [row({ evt: 'discover.card_view', hour: 10, count: 12 })];
    const out = foldSessionsFromHourly(rows);
    expect(out[0].windowShopping).toBe(true);
  });

  it('does NOT flag windowShopping when at least one swipe happened', () => {
    const rows = [
      row({ evt: 'discover.card_view', hour: 10, count: 12 }),
      row({ evt: 'swipe.left',         hour: 10, count: 1 }),
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out[0].windowShopping).toBe(false);
  });

  it('flags ghostedSelf when reads > 0 and sends = 0', () => {
    const rows = [
      row({ evt: 'msg.read', hour: 10, count: 3 }),
      row({ evt: 'discover.card_view', hour: 10, count: 1 }),
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out[0].ghostedSelf).toBe(true);
  });

  it('drops sessions shorter than minDurationMs', () => {
    // A single row with idle 0 still implies an hour bucket → 1h duration.
    // Force minDuration to a very large value to verify the filter works.
    const rows = [row({ evt: 'discover.card_view', hour: 10 })];
    const out = foldSessionsFromHourly(rows, 60 * 60 * 1000, 24 * 60 * 60 * 1000);
    expect(out).toEqual([]);
  });

  it('separates per uidHash', () => {
    const rows = [
      { ...row({ evt: 'discover.card_view', hour: 10 }), uidHash: 'a' },
      { ...row({ evt: 'discover.card_view', hour: 10 }), uidHash: 'b' },
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((s) => s.uidHash))).toEqual(new Set(['a', 'b']));
  });

  it('collects routesVisited from row.route hints', () => {
    const rows = [
      row({ evt: 'discover.card_view', hour: 10, route: '/discover' }),
      row({ evt: 'msg.read',           hour: 10, route: '/messages' }),
    ];
    const out = foldSessionsFromHourly(rows);
    expect(out[0].routesVisited.sort()).toEqual(['/discover', '/messages']);
  });
});
