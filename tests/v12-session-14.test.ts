/**
 * v1.2 (session 14) — Tests for the final engineering pass.
 *
 *   Task 1 — Wire MatchSuccessModal into discover/page.tsx (regression
 *            tests live in web-ux-invariants.test.ts to keep grep tests
 *            colocated with the rest of the web static assertions).
 *   Task 2 — Ranker consumer for Settings.manualIntentOverride. Session
 *            13 shipped the write endpoint + column; here we verify the
 *            /discover handler consumes the override behind the same
 *            FEATURE_INTENT_VISIBILITY_ENABLED flag.
 *   Task 3 — Docs refresh (no code — verified by grep-scoping the
 *            canonical docs to make sure the drift fixes land).
 *
 * The Task 2 handler branch is exercised via pure-logic reimplementation
 * (mirrors the v12-session-13 pattern) so this test file stays inside
 * the fast vitest suite (no Postgres, no Redis).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTENT_CLASS_IDS } from '../services/shared/src/schemas';
import { validateV6Payload } from '../services/shared/src/track/v6Validators';

// ═════════════════════════════════════════════════════════════════════
// Task 2 — Ranker consumer for Settings.manualIntentOverride
// ═════════════════════════════════════════════════════════════════════

/**
 * Reimplementation of the exact branch we added to social/src/server.ts.
 * Inputs mirror the handler-scope variables at the moment the override
 * decision runs (flag + snapshot + settings row). The output shape mirrors
 * the local `intentRightNow` assignment + `intentOverrideApplied` bit.
 *
 * Keep this in sync with the branch — if the handler changes, update
 * this fixture in lockstep so the tests keep locking real behaviour.
 */
type IntentSnapshot = { topClass: string; confidence: number } | null;
function resolveIntent(opts: {
  flagOn: boolean;
  inferred: IntentSnapshot;
  override: string | null;
}): { intent: IntentSnapshot; overrideApplied: boolean } {
  let intent = opts.inferred;
  let overrideApplied = false;
  if (opts.flagOn) {
    if (opts.override) {
      intent = { topClass: opts.override, confidence: 1 };
      overrideApplied = true;
    }
  }
  return { intent, overrideApplied };
}

describe('Task 2 — manualIntentOverride consumer in the ranker', () => {
  it('(a) no override + flag on → uses inferred intent', () => {
    const r = resolveIntent({
      flagOn: true,
      inferred: { topClass: 'casual_scroll', confidence: 0.6 },
      override: null,
    });
    expect(r.intent?.topClass).toBe('casual_scroll');
    expect(r.intent?.confidence).toBe(0.6);
    expect(r.overrideApplied).toBe(false);
  });

  it('(b) override set + flag on → uses override at confidence 1', () => {
    const r = resolveIntent({
      flagOn: true,
      inferred: { topClass: 'casual_scroll', confidence: 0.6 },
      override: 'serious_search',
    });
    expect(r.intent?.topClass).toBe('serious_search');
    expect(r.intent?.confidence).toBe(1);
    expect(r.overrideApplied).toBe(true);
  });

  it('(c) override set + flag OFF → uses inferred (flag-gated per hard constraint)', () => {
    const r = resolveIntent({
      flagOn: false,
      inferred: { topClass: 'casual_scroll', confidence: 0.6 },
      override: 'serious_search',
    });
    // Flag off: existing behaviour is bit-identical, so we ignore the override.
    expect(r.intent?.topClass).toBe('casual_scroll');
    expect(r.overrideApplied).toBe(false);
  });

  it('(d) override set + flag on + no inferred (fresh user) → still applies override', () => {
    const r = resolveIntent({
      flagOn: true,
      inferred: null,
      override: 'decision_fatigued',
    });
    expect(r.intent?.topClass).toBe('decision_fatigued');
    expect(r.overrideApplied).toBe(true);
  });

  it('(e) override accepts every enum value (matches session 13 write schema)', () => {
    for (const c of INTENT_CLASS_IDS) {
      const r = resolveIntent({ flagOn: true, inferred: null, override: c });
      expect(r.intent?.topClass).toBe(c);
      expect(r.overrideApplied).toBe(true);
    }
  });

  it('handler branch is wired in social/server.ts + gated on the flag', () => {
    const src = readFileSync(resolve(__dirname, '..', 'services/social/src/server.ts'), 'utf8');
    // Flag helper exists.
    expect(src).toMatch(/function isIntentVisibilityEnabled\(\)/);
    expect(src).toMatch(/FEATURE_INTENT_VISIBILITY_ENABLED/);
    // Branch reads Settings.manualIntentOverride.
    expect(src).toMatch(/manualIntentOverride/);
    // Emits the new event when the override is applied.
    expect(src).toMatch(/intent\.override_applied/);
    // Surfaces the bit in meta.v8 for QA / debugging.
    expect(src).toMatch(/intentOverride:\s*v8MoBlock\.intentOverride/);
  });

  it('intent.override_applied schema accepts the canonical payload + rejects unknown fields', () => {
    const ok = validateV6Payload('intent.override_applied', {
      override: 'serious_search',
      inferred: 'casual_scroll',
    });
    expect(ok.ok).toBe(true);
    // Nullable inferred (fresh user, no snapshot yet).
    const okNull = validateV6Payload('intent.override_applied', {
      override: 'serious_search',
      inferred: null,
    });
    expect(okNull.ok).toBe(true);
    // Strict: reject unknown fields.
    const bad = validateV6Payload('intent.override_applied', {
      override: 'serious_search',
      evil: 1,
    });
    expect(bad.ok).toBe(false);
    // Reject unknown intent classes.
    const badClass = validateV6Payload('intent.override_applied', {
      override: 'not_a_class',
    });
    expect(badClass.ok).toBe(false);
  });

  it('event name is registered in TrackEventName so the client SDK is type-safe', () => {
    const src = readFileSync(resolve(__dirname, '..', 'services/shared/src/track/events.ts'), 'utf8');
    expect(src).toMatch(/'intent\.override_applied'/);
  });
});
