import { describe, it, expect } from 'vitest';
import {
  inferIntent,
  topIntent,
  intentConfidence,
  INTENT_CLASS_PRIOR,
  ALL_INTENT_CLASSES,
  INTENT_TTL_MS,
  type IntentClass,
  type RecentEvent,
} from '../v8/intentRightNow';
import { makeRng, seedFromString } from '../seedRandom';

const NOW = 1_750_000_000_000; // because: fixed nowMs keeps the tests deterministic

function ev(evt: string, ageMs: number, payload?: Record<string, unknown>): RecentEvent {
  return { evt, ageMs, payload };
}

const sumOf = (v: Record<IntentClass, number>): number =>
  ALL_INTENT_CLASSES.reduce((s, k) => s + v[k], 0);

describe('inferIntent — basics', () => {
  it('returns INTENT_CLASS_PRIOR exactly on empty events', () => {
    const v = inferIntent({ lastNEvents: [], viewerFeatures: {}, nowMs: NOW });
    for (const k of ALL_INTENT_CLASSES) expect(v[k]).toBe(INTENT_CLASS_PRIOR[k]);
  });

  it('prior sums to 1.0 exactly', () => {
    expect(sumOf(INTENT_CLASS_PRIOR)).toBeCloseTo(1.0, 9);
  });

  it('TTL is the documented 90s constant', () => {
    expect(INTENT_TTL_MS).toBe(90_000);
  });

  it('always returns a vector that sums to 1.0 (single event)', () => {
    const v = inferIntent({
      lastNEvents: [ev('card.bio.expand', 1000)],
      viewerFeatures: {},
      nowMs: NOW,
    });
    expect(sumOf(v)).toBeCloseTo(1.0, 6);
  });
});

describe('inferIntent — class dominance', () => {
  it('rage clicks + regret + repeat-pass → decision_fatigued is top', () => {
    const events: RecentEvent[] = [
      ev('click.rage', 1000),
      ev('click.rage', 1500),
      ev('click.rage', 2000),
      ev('click.rage', 2500),
      ev('swipe.regret', 3000),
      ev('swipe.regret', 4000),
      ev('swipe.repeat_pass', 5000),
      ev('swipe.repeat_pass', 6000),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('decision_fatigued');
  });

  it('compose + send events on /messages → reply_mood is top', () => {
    const events: RecentEvent[] = [
      ev('nav.route', 1000, { route: '/messages' }),
      ev('msg.compose_start', 2000),
      ev('msg.send', 3000),
      ev('msg.send', 4000),
      ev('focus.element', 4500, { id: 'compose-input' }),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('reply_mood');
  });

  it('bio expand + photo swipe + mid dwell → intentional_browse is top', () => {
    const events: RecentEvent[] = [
      ev('card.bio.expand', 1000),
      ev('card.bio.expand', 2000),
      ev('card.photo.swipe', 2500),
      ev('card.photo.swipe', 3000),
      ev('card.impression.100', 4000, { dwellMs: 3000 }),
      ev('card.impression.100', 5000, { dwellMs: 2500 }),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('intentional_browse');
  });

  it('see-later view + matches route → review_existing is top', () => {
    const events: RecentEvent[] = [
      ev('nav.route', 1000, { route: '/matches' }),
      ev('discover.see_later.view', 2000),
      ev('discover.see_later.view', 3000),
      ev('chat.open', 4000),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('review_existing');
  });

  it('filter changes + DTM + multiple bio expands + long dwell → serious_search is top', () => {
    const events: RecentEvent[] = [
      ev('filter.change', 1000),
      ev('filter.change', 1500),
      ev('filter.hesitation', 2000),
      ev('dtm.answer', 2500),
      ev('dtm.answer', 3000),
      ev('card.bio.expand', 3500),
      ev('card.bio.expand', 4000),
      ev('card.impression.100', 5000, { dwellMs: 8000 }),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('serious_search');
  });

  it('low-dwell impressions + route churn + no bio expand → distraction_browse is top', () => {
    const events: RecentEvent[] = [
      ev('nav.route', 1000, { route: '/discover' }),
      ev('nav.route', 1500, { route: '/feed' }),
      ev('nav.route', 2000, { route: '/discover' }),
      ev('nav.route', 2500, { route: '/profile' }),
      ev('card.impression.50', 3000, { dwellMs: 200 }),
      ev('card.impression.50', 3500, { dwellMs: 300 }),
      ev('card.impression.50', 4000, { dwellMs: 250 }),
      ev('card.impression.50', 4500, { dwellMs: 180 }),
      ev('discover.swipe', 5000),
      ev('discover.swipe', 5500),
      ev('discover.swipe', 6000),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(topIntent(v)).toBe('distraction_browse');
  });
});

describe('inferIntent — properties', () => {
  it('softmax sums to 1.0 ± 1e-6 (100 random inputs, seeded)', () => {
    const rng = makeRng(seedFromString('intent-property-1'));
    const evtNames = [
      'card.bio.expand', 'card.photo.swipe', 'card.impression.50',
      'card.impression.100', 'click.rage', 'click.dead', 'swipe.regret',
      'swipe.repeat_pass', 'nav.route', 'msg.send', 'msg.compose_start',
      'discover.see_later.view', 'filter.change', 'dtm.answer', 'chat.open',
    ];
    for (let trial = 0; trial < 100; trial++) {
      const n = rng.nextInt(1, 25);
      const events: RecentEvent[] = [];
      for (let i = 0; i < n; i++) {
        const evt = evtNames[rng.nextInt(0, evtNames.length - 1)] as string;
        const ageMs = rng.nextInt(0, 5 * 60 * 1000);
        const dwellMs = rng.nextInt(50, 12000);
        events.push(ev(evt, ageMs, { dwellMs, route: '/discover' }));
      }
      const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
      expect(sumOf(v)).toBeCloseTo(1.0, 6);
    }
  });

  it('every component is in [0,1] for all 100 random inputs', () => {
    const rng = makeRng(seedFromString('intent-property-2'));
    for (let trial = 0; trial < 100; trial++) {
      const n = rng.nextInt(0, 30);
      const events: RecentEvent[] = [];
      for (let i = 0; i < n; i++) {
        events.push(ev('card.bio.expand', rng.nextInt(0, 5 * 60_000), { dwellMs: rng.nextInt(50, 12000) }));
      }
      const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
      for (const k of ALL_INTENT_CLASSES) {
        expect(v[k]).toBeGreaterThanOrEqual(0);
        expect(v[k]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('determinism: same input → identical output', () => {
    const events: RecentEvent[] = [
      ev('card.bio.expand', 1000),
      ev('msg.send', 2000),
      ev('click.rage', 3000),
    ];
    const a = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    const b = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(a).toEqual(b);
    // topIntent stability
    expect(topIntent(a)).toBe(topIntent(b));
  });

  // v2: window widened from 5min → 10min so events must be > 10min old
  // to be ignored for the general (non-TIGHT) classes.
  it('events older than 10min are ignored for general classes', () => {
    const events: RecentEvent[] = [
      ev('click.rage', 11 * 60 * 1000),
      ev('click.rage', 12 * 60 * 1000),
      ev('click.rage', 13 * 60 * 1000),
      ev('swipe.regret', 14 * 60 * 1000),
    ];
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    // Without recent events, the prior dominates — all classes near 1/7.
    expect(intentConfidence(v)).toBeLessThan(0.05);
  });

  it('caps event window at MAX_EVENT_WINDOW (no crash on huge inputs)', () => {
    const events: RecentEvent[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push(ev('card.bio.expand', 1000 + i, { dwellMs: 2000 }));
    }
    const v = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    expect(sumOf(v)).toBeCloseTo(1.0, 6);
    expect(topIntent(v)).toBe('intentional_browse');
  });
});

describe('topIntent / intentConfidence helpers', () => {
  it('topIntent argmax over the prior is the canonically-first class (stable tie-break)', () => {
    // Prior is uniform; topIntent should pick the first class in ALL_INTENT_CLASSES.
    expect(topIntent(INTENT_CLASS_PRIOR)).toBe(ALL_INTENT_CLASSES[0]);
  });

  it('intentConfidence on the prior is 0', () => {
    expect(intentConfidence(INTENT_CLASS_PRIOR)).toBe(0);
  });

  it('intentConfidence rises with stronger signal', () => {
    const weak: Record<IntentClass, number> = { ...INTENT_CLASS_PRIOR, intentional_browse: 0.20, distraction_browse: 0.14 };
    // Re-normalise:
    let s = 0;
    for (const k of ALL_INTENT_CLASSES) s += weak[k];
    for (const k of ALL_INTENT_CLASSES) weak[k] = weak[k] / s;
    const strong: Record<IntentClass, number> = {
      distraction_browse: 0.02, intentional_browse: 0.80, reply_mood: 0.03,
      review_existing: 0.03, serious_search: 0.05, casual_scroll: 0.05, decision_fatigued: 0.02,
    };
    expect(intentConfidence(strong)).toBeGreaterThan(intentConfidence(weak));
  });

  it('viewerFeatures.lastSessionWindowShopping nudges intentional_browse', () => {
    const events: RecentEvent[] = [ev('card.impression.100', 1000, { dwellMs: 2500 })];
    const without = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    const withFlag = inferIntent({
      lastNEvents: events,
      viewerFeatures: { lastSessionWindowShopping: true },
      nowMs: NOW,
    });
    expect(withFlag.intentional_browse).toBeGreaterThan(without.intentional_browse);
  });

  it('attentionProfile=laser nudges serious_search', () => {
    const events: RecentEvent[] = [ev('card.impression.100', 1000, { dwellMs: 4000 })];
    const neutral = inferIntent({ lastNEvents: events, viewerFeatures: {}, nowMs: NOW });
    const laser = inferIntent({
      lastNEvents: events,
      viewerFeatures: { attentionProfile: 'laser' },
      nowMs: NOW,
    });
    expect(laser.serious_search).toBeGreaterThan(neutral.serious_search);
  });
});
