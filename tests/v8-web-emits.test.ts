/**
 * v8 (v3.6.0) — web SDK emit-shape contract.
 *
 * Exercises the pure `emit*` functions in `services/web/src/lib/track/v8Emit.ts`
 * (used by the corresponding React hooks in `useTrackActivity.ts`) and the
 * `engagementTracker` collector that the Discover/Reels surfaces drive.
 *
 * Approach: both modules funnel through `track()` from `@/lib/track`
 * (`services/web/src/lib/track/index`). That module pulls in browser-only
 * collectors, so we stub it with `vi.mock` before import. The stub records
 * every `track` call so we can assert event name + payload shape — the
 * same contract `V6_VALIDATORS` in `services/shared/src/track/v6Validators.ts`
 * enforces server-side.
 *
 * The vitest config (`vitest.config.ts`) excludes `services/web/**` so the
 * web bundle is never spun up; we import the files via direct relative
 * paths and rely on the mock to break the runtime dependency chain.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `vi.mock` is hoisted to the top of the file by Vitest, so the factory
// MUST NOT reference module-scoped values. We stash the recorder on
// `globalThis` so the factory can mutate it without a closure capture.
declare global {
  // eslint-disable-next-line no-var
  var __v8EmittedEvents: Array<{ name: string; payload?: Record<string, unknown> }>;
}
globalThis.__v8EmittedEvents ??= [];

// Both possible resolutions of `@/lib/track` — the directory and the
// explicit /index — are stubbed so either import path lands on the
// same recorder.
vi.mock('../services/web/src/lib/track', () => ({
  track: (name: string, payload?: Record<string, unknown>) => {
    globalThis.__v8EmittedEvents.push({ name, payload });
  },
}));
vi.mock('../services/web/src/lib/track/index', () => ({
  track: (name: string, payload?: Record<string, unknown>) => {
    globalThis.__v8EmittedEvents.push({ name, payload });
  },
}));

const emitted = globalThis.__v8EmittedEvents;

import {
  emitEngagementDepth,
  emitPolarity,
  emitMoveAccepted,
  emitMoveComposed,
} from '../services/web/src/lib/track/v8Emit';
import {
  engagementTracker,
  computeDepth,
  computePolarity,
} from '../services/web/src/lib/track/collectors/engagement';

// 22-char base64url-ish hash — meets uidHash min(20)/max(24) bound.
const HASH22 = 'a1b2c3d4e5f6g7h8i9j0kl';

beforeEach(() => {
  emitted.length = 0;
  engagementTracker._reset();
});

// ─── pure-math suites ───────────────────────────────────────────────
describe('engagement.depth — pure math', () => {
  it('returns 0 for a zero-signal card', () => {
    expect(computeDepth({ dwellMs: 0, bioExpanded: false, photoSwiped: false, hovered: false, liked: false })).toBe(0);
  });

  it('caps at 1.0 even when every signal stacks', () => {
    const d = computeDepth({ dwellMs: 60_000, bioExpanded: true, photoSwiped: true, hovered: true, liked: true });
    expect(d).toBe(1);
  });

  it('dwell alone scales to 0.5 at the 3s saturation point', () => {
    const d = computeDepth({ dwellMs: 3_000, bioExpanded: false, photoSwiped: false, hovered: false, liked: false });
    expect(d).toBe(0.5);
  });

  it('like + bio + photo accumulates above dwell alone', () => {
    const justDwell = computeDepth({ dwellMs: 1_000, bioExpanded: false, photoSwiped: false, hovered: false, liked: false });
    const withAll   = computeDepth({ dwellMs: 1_000, bioExpanded: true, photoSwiped: true, hovered: false, liked: true });
    expect(withAll).toBeGreaterThan(justDwell);
  });
});

describe('polarity.computed — pure math', () => {
  it('right swipe yields positive polarity', () => {
    const p = computePolarity({ direction: 'right', dwellMs: 0, bioExpanded: false });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('left swipe yields negative polarity', () => {
    const p = computePolarity({ direction: 'left', dwellMs: 0, bioExpanded: false });
    expect(p).toBeLessThan(0);
    expect(p).toBeGreaterThanOrEqual(-1);
  });

  it('thoughtful pass reads more strongly negative than a reflexive scan', () => {
    // A long-dwell pass is a confident "no" (more negative). A fast scan
    // gets a -0.2 modifier for being accidental but still less weight
    // than a deliberate study. We assert the deliberate signal wins in
    // magnitude.
    const reflexive  = computePolarity({ direction: 'left', dwellMs: 0,     bioExpanded: false });
    const thoughtful = computePolarity({ direction: 'left', dwellMs: 5_000, bioExpanded: false });
    expect(Math.abs(thoughtful)).toBeGreaterThanOrEqual(Math.abs(reflexive));
    expect(thoughtful).toBeLessThan(0);
    expect(reflexive).toBeLessThan(0);
  });

  it('super-like clamps at +1 even with long dwell + bio', () => {
    const p = computePolarity({ direction: 'super', dwellMs: 60_000, bioExpanded: true });
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThan(0.5);
  });
});

// ─── engagementTracker — emit shape ──────────────────────────────────
describe('engagementTracker — emit shape', () => {
  it('commit emits both depth + polarity for the tid', () => {
    engagementTracker.onCardVisible('user-1', 'discover');
    engagementTracker.commit('user-1', 'left', { surface: 'discover' });
    const names = emitted.map((e) => e.name);
    expect(names).toContain('engagement.depth_scored');
    expect(names).toContain('polarity.computed');
  });

  it('omits invalid surface ("creativity") so the strict validator does not trip', () => {
    engagementTracker.onCardVisible('user-2');
    engagementTracker.commit('user-2', 'right');
    const depthEvt = emitted.find((e) => e.name === 'engagement.depth_scored');
    expect(depthEvt).toBeDefined();
    expect(depthEvt?.payload).not.toHaveProperty('surface');
  });

  it('keeps surface when it is one of the schema\'s allowed values', () => {
    engagementTracker.onCardVisible('user-3', 'discover');
    engagementTracker.commit('user-3', 'right', { surface: 'discover' });
    const depthEvt = emitted.find((e) => e.name === 'engagement.depth_scored');
    expect(depthEvt?.payload).toMatchObject({ tid: 'user-3', surface: 'discover' });
  });

  it('depth ∈ [0,1] and polarity ∈ [-1,+1] for any direction', () => {
    for (const dir of ['left', 'right', 'up', 'super'] as const) {
      engagementTracker.onCardVisible(`t-${dir}`);
      engagementTracker.commit(`t-${dir}`, dir);
    }
    for (const e of emitted) {
      if (e.name === 'engagement.depth_scored') {
        const d = (e.payload as any).depth;
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
      }
      if (e.name === 'polarity.computed') {
        const p = (e.payload as any).polarity;
        expect(p).toBeGreaterThanOrEqual(-1);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it('flags accidentalClick when < 500ms dwell with no bio/photo', () => {
    engagementTracker.onCardVisible('quick');
    engagementTracker.commit('quick', 'left');
    const depthEvt = emitted.find((e) => e.name === 'engagement.depth_scored');
    expect((depthEvt?.payload as any).accidentalClick).toBe(true);
  });

  it('a second commit for the same tid is a no-op (StrictMode safety)', () => {
    engagementTracker.onCardVisible('dup');
    engagementTracker.commit('dup', 'right');
    const firstCount = emitted.length;
    engagementTracker.commit('dup', 'right');
    expect(emitted.length).toBe(firstCount);
  });

  it('like signal raises depth above no-like baseline', () => {
    engagementTracker.onCardVisible('a');
    engagementTracker.commit('a', 'right');
    const depthA = (emitted.find((e) => e.name === 'engagement.depth_scored')?.payload as any).depth;
    emitted.length = 0;
    engagementTracker._reset();

    engagementTracker.onCardVisible('b');
    engagementTracker.onLike('b');
    engagementTracker.commit('b', 'right');
    const depthB = (emitted.find((e) => e.name === 'engagement.depth_scored')?.payload as any).depth;
    expect(depthB).toBeGreaterThan(depthA);
  });

  it('does not emit when tid never became visible', () => {
    engagementTracker.commit('ghost', 'right');
    expect(emitted.length).toBe(0);
  });
});

// ─── v8 emit helpers (pure functions backing the React hooks) ────────
describe('emitEngagementDepth / emitPolarity', () => {
  it('emitEngagementDepth clamps depth to [0,1]', () => {
    emitEngagementDepth('t1', 'discover', 2, false);
    const last = emitted[emitted.length - 1];
    expect(last.name).toBe('engagement.depth_scored');
    expect((last.payload as any).depth).toBe(1);
    expect((last.payload as any).accidentalClick).toBe(false);
  });

  it('emitEngagementDepth drops when tid is missing', () => {
    emitEngagementDepth(undefined, 'discover', 0.5, false);
    expect(emitted.length).toBe(0);
  });

  it('emitPolarity clamps to [-1,+1] and rounds dwellMs', () => {
    emitPolarity('t2', -99, 250.7);
    const last = emitted[emitted.length - 1];
    expect(last.name).toBe('polarity.computed');
    expect((last.payload as any).polarity).toBe(-1);
    expect((last.payload as any).dwellMs).toBe(251);
  });

  it('emitPolarity omits dwellMs when not supplied', () => {
    emitPolarity('t3', 0.5);
    const last = emitted[emitted.length - 1];
    expect(last.payload).not.toHaveProperty('dwellMs');
  });
});

describe('emitMoveAccepted / emitMoveComposed', () => {
  it('emitMoveAccepted refuses bad receiverHash silently', () => {
    emitMoveAccepted('too-short', 0, 'shared_interest', 'casual');
    expect(emitted.length).toBe(0);
  });

  it('emitMoveAccepted clamps slotIndex to [0,4] and trims hookCategory', () => {
    emitMoveAccepted(HASH22, 99, 'a'.repeat(80), 'reflective');
    const last = emitted[emitted.length - 1];
    expect(last.name).toBe('move.suggestion_accepted');
    expect((last.payload as any).slotIndex).toBe(4);
    expect((last.payload as any).hookCategory.length).toBeLessThanOrEqual(32);
  });

  it('emitMoveComposed caps suggestion/fallback counts at 5', () => {
    emitMoveComposed(HASH22, 99, 99, ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 'hi_en');
    const last = emitted[emitted.length - 1];
    expect(last.name).toBe('move.composed');
    const p = last.payload as any;
    expect(p.suggestionCount).toBe(5);
    expect(p.fallbackCount).toBe(5);
    expect(p.hookCategories).toHaveLength(5);
    expect(p.languageFamily).toBe('hi_en');
  });

  it('emitMoveComposed drops on bad receiverHash', () => {
    emitMoveComposed('xx', 1, 0, ['shared_interest'], 'en');
    expect(emitted.length).toBe(0);
  });
});
