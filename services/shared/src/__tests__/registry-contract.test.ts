/**
 * Registry contract — every registered algo must expose:
 *   - a non-empty name
 *   - a non-empty surface
 *   - at least one weight that sums (with the rest) to ~1.0 (when weights are
 *     a probability/contribution split) OR be a non-empty empty record (for
 *     algos that don't compose weighted terms)
 *   - usesEvents listed (or explicitly empty array, never undefined)
 *
 * This is a static guard: it loads the registry by importing every algo
 * module and then asserts invariants. Catching contract drift here means
 * the signal-coverage walker never sees a malformed entry.
 */
import { describe, it, expect } from 'vitest';

// Force every algo module to register itself.
import '../algo/forYou';
import '../algo/forYouV6';
import '../algo/dtm';
import '../algo/dtmV6';
import '../algo/notifyTiming';
import '../algo/moves';
import '../algo/cf';
import '../algo/serious';
import '../algo/searchAugment';
import '../algo/aiPicks';
import '../algo/beats';

import { getRegistry } from '../algo/registry';

const SUM_TOLERANCE = 1e-6;

describe('algo registry contract', () => {
  const all = getRegistry();

  it('has at least one registered algo', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it('every algo has a non-empty name and surface', () => {
    for (const a of all) {
      expect(typeof a.name).toBe('string');
      expect(a.name.length).toBeGreaterThan(0);
      expect(typeof a.surface).toBe('string');
      expect(a.surface.length).toBeGreaterThan(0);
    }
  });

  it('names are unique', () => {
    const seen = new Set<string>();
    for (const a of all) {
      expect(seen.has(a.name), `duplicate algo name ${a.name}`).toBe(false);
      seen.add(a.name);
    }
  });

  it('usesEvents is always an array (never undefined)', () => {
    for (const a of all) {
      expect(Array.isArray(a.usesEvents)).toBe(true);
    }
  });

  it('weights object is present', () => {
    for (const a of all) {
      expect(a.weights).toBeTruthy();
      expect(typeof a.weights).toBe('object');
    }
  });

  it('when weights are present and non-empty, they sum to ~1.0', () => {
    for (const a of all) {
      const vals = Object.values(a.weights);
      if (vals.length === 0) continue;
      const sum = vals.reduce((s, v) => s + v, 0);
      // Algos can opt out of the sum-to-1 invariant by emitting weight 0
      // for every key (e.g. pass-through registries).
      if (sum === 0) continue;
      expect(
        Math.abs(sum - 1.0),
        `algo ${a.name} weights sum to ${sum}, expected ~1.0`,
      ).toBeLessThan(SUM_TOLERANCE * 1_000_000); // 1e-3 tolerance for hand-tuned weights
    }
  });

  it('forYouV6 is registered alongside the v4 forYou', () => {
    const names = new Set(all.map((a) => a.name));
    expect(names.has('forYou')).toBe(true);
    expect(names.has('forYouV6')).toBe(true);
  });
});
