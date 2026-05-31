import { describe, it, expect } from 'vitest';
import {
  deriveSessionSummary, aggregateFocusAffinity,
  type RawEvent,
} from '../sessionDerive';

function ev(name: string, tOffsetSec: number, p: Record<string, unknown> = {}, d?: number): RawEvent {
  return { e: name, t: 1_700_000_000_000 + tOffsetSec * 1000, p, d };
}

describe('deriveSessionSummary', () => {
  it('returns empty summary for empty input', () => {
    const out = deriveSessionSummary([]);
    expect(out.durationMs).toBe(0);
    expect(out.cardsViewed).toBe(0);
    expect(out.zeroActionSession).toBe(false);
  });

  it('computes basic counters', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/discover' }),
      ev('discover.card_view', 1),
      ev('discover.card_view', 2),
      ev('discover.card_view', 3),
      ev('swipe.commit', 4, { dir: 'right' }),
      ev('swipe.commit', 5, { dir: 'left' }),
      ev('msg.send', 30),
      ev('msg.read', 35),
    ]);
    expect(out.cardsViewed).toBe(3);
    expect(out.swipesRight).toBe(1);
    expect(out.swipesLeft).toBe(1);
    expect(out.msgsSent).toBe(1);
    expect(out.msgsRead).toBe(1);
    expect(out.routesVisited).toEqual(['/discover']);
    expect(out.durationMs).toBe(35_000);
  });

  it('flags zeroActionSession when foreground >30s with no actions', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/profile' }),
      ev('scroll.depth', 10),
      ev('scroll.depth', 35),
    ]);
    expect(out.zeroActionSession).toBe(true);
  });

  it('does NOT flag zeroActionSession when session shorter than 30s', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/profile' }),
      ev('scroll.depth', 10),
    ]);
    expect(out.zeroActionSession).toBe(false);
  });

  it('flags windowShopping when >=5 cards viewed with no swipes/msgs', () => {
    const evs = [ev('page.view', 0, { path: '/discover' })];
    for (let i = 1; i <= 6; i++) evs.push(ev('discover.card_view', i));
    const out = deriveSessionSummary(evs);
    expect(out.windowShopping).toBe(true);
  });

  it('does NOT flag windowShopping when a swipe occurred', () => {
    const evs = [ev('page.view', 0, { path: '/discover' })];
    for (let i = 1; i <= 6; i++) evs.push(ev('discover.card_view', i));
    evs.push(ev('swipe.commit', 7, { dir: 'right' }));
    const out = deriveSessionSummary(evs);
    expect(out.windowShopping).toBe(false);
  });

  it('flags ghostedSelf when msgs read but none sent', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/messages' }),
      ev('msg.read', 5),
      ev('msg.read', 12),
    ]);
    expect(out.ghostedSelf).toBe(true);
  });

  it('charges idle from matched idle.enter / idle.exit', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/feed' }),
      ev('attention.idle.enter', 10),
      ev('attention.idle.exit', 25),
      ev('scroll.depth', 30),
    ]);
    expect(out.idleMs).toBe(15_000);
  });

  it('charges an unmatched idle.enter against endedAt', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/feed' }),
      ev('attention.idle.enter', 10),
      ev('msg.read', 60), // session ends at 60s, no idle.exit
    ]);
    expect(out.idleMs).toBe(50_000);
  });

  it('caps idleMs at durationMs', () => {
    const out = deriveSessionSummary([
      ev('attention.idle.enter', 0),
      // No exit. End at 5s; idleMs would be 5s = duration. OK.
      ev('page.view', 5, { path: '/feed' }),
    ]);
    expect(out.idleMs).toBeLessThanOrEqual(out.durationMs);
  });

  it('sorts out-of-order events before deriving', () => {
    const out = deriveSessionSummary([
      ev('msg.send', 30),
      ev('page.view', 0, { path: '/messages' }),
      ev('swipe.commit', 10, { dir: 'right' }),
    ]);
    expect(out.startedAt.getTime()).toBeLessThan(out.endedAt.getTime());
    expect(out.durationMs).toBe(30_000);
  });

  it('reads route from `path` OR `to` payload field', () => {
    const out = deriveSessionSummary([
      ev('page.view', 0, { path: '/a' }),
      ev('nav.route', 1, { to: '/b' }),
      ev('nav.route', 2, { to: '/a' }),  // dedup
    ]);
    expect(out.routesVisited.sort()).toEqual(['/a', '/b']);
  });
});

describe('aggregateFocusAffinity', () => {
  it('returns empty array for no matching events', () => {
    expect(aggregateFocusAffinity([
      ev('discover.card_view', 0),
      ev('msg.send', 5),
    ])).toEqual([]);
  });

  it('counts focus.element per (route, elementId, hour)', () => {
    const out = aggregateFocusAffinity([
      ev('focus.element', 0, { route: '/discover', elementId: 'filter-age' }),
      ev('focus.element', 1, { route: '/discover', elementId: 'filter-age' }),
      ev('focus.element', 2, { route: '/discover', elementId: 'filter-city' }),
    ]);
    const ageRow = out.find((r) => r.elementId === 'filter-age');
    expect(ageRow?.focusCount).toBe(2);
    expect(ageRow?.dwellSumMs).toBe(0);
  });

  it('sums dwell from intent.dwell', () => {
    const out = aggregateFocusAffinity([
      ev('intent.dwell', 0, { route: '/profile', elementId: 'bio', dwellMs: 1200 }),
      ev('intent.dwell', 1, { route: '/profile', elementId: 'bio', dwellMs: 800 }),
    ]);
    expect(out[0].dwellSumMs).toBe(2000);
    expect(out[0].focusCount).toBe(2);
  });

  it('skips events with missing route or elementId', () => {
    const out = aggregateFocusAffinity([
      ev('focus.element', 0, { route: '/x' }),                 // no elementId
      ev('focus.element', 1, { elementId: 'btn' }),            // no route
      ev('focus.element', 2, { route: '/x', elementId: 'btn' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('buckets by hour (top of hour, UTC)', () => {
    const t0 = 1_700_000_000_000;
    const baseHour = Math.floor(t0 / 3_600_000) * 3_600_000;
    const out = aggregateFocusAffinity([
      { e: 'focus.element', t: baseHour + 60_000,    p: { route: '/x', elementId: 'a' } },
      { e: 'focus.element', t: baseHour + 1_800_000, p: { route: '/x', elementId: 'a' } },
      { e: 'focus.element', t: baseHour + 3_700_000, p: { route: '/x', elementId: 'a' } }, // next hour
    ]);
    expect(out).toHaveLength(2);
  });

  it('falls back to event d when payload dwellMs missing', () => {
    const out = aggregateFocusAffinity([
      { e: 'intent.dwell', t: 1, p: { route: '/x', elementId: 'a' }, d: 500 },
    ]);
    expect(out[0].dwellSumMs).toBe(500);
  });
});
