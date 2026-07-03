import { describe, it, expect } from 'vitest';
import { computePolarity, type PolarityInput } from '../v8/polarity';

function input(overrides: Partial<PolarityInput> = {}): PolarityInput {
  return {
    actionTaken: null,
    dwellMs: 0,
    bioExpanded: false,
    photoSwipeCount: 0,
    returnVisit: false,
    returnCount: 0,
    ...overrides,
  };
}

describe('computePolarity — positive signals', () => {
  it('long dwell + bio expand + LIKE → polarity ≥ 0.7', () => {
    const { polarity } = computePolarity(input({
      actionTaken: 'like',
      dwellMs: 10_000,
      bioExpanded: true,
      photoSwipeCount: 4,
      returnVisit: true,
      returnCount: 3,
    }));
    expect(polarity).toBeGreaterThanOrEqual(0.7);
  });

  it('like alone gives a positive polarity', () => {
    const { polarity } = computePolarity(input({ actionTaken: 'like', dwellMs: 2000 }));
    expect(polarity).toBeGreaterThan(0);
  });

  it('super_like behaves like like for the action term', () => {
    const a = computePolarity(input({ actionTaken: 'like', dwellMs: 5000, bioExpanded: true }));
    const b = computePolarity(input({ actionTaken: 'super_like', dwellMs: 5000, bioExpanded: true }));
    expect(a.polarity).toBeCloseTo(b.polarity, 6);
  });

  it('full positive maxes near +1', () => {
    const { polarity } = computePolarity(input({
      actionTaken: 'like',
      dwellMs: 60_000,
      bioExpanded: true,
      photoSwipeCount: 30,
      returnVisit: true,
      returnCount: 10,
    }));
    expect(polarity).toBeLessThanOrEqual(1);
    expect(polarity).toBeGreaterThan(0.7);
  });
});

describe('computePolarity — negative signals (hate-scroll)', () => {
  it('long dwell + bio expand + PASS → polarity ≤ -0.5 (hate-scroll signature)', () => {
    const { polarity } = computePolarity(input({
      actionTaken: 'pass',
      dwellMs: 10_000,
      bioExpanded: true,
      photoSwipeCount: 4,
    }));
    expect(polarity).toBeLessThanOrEqual(-0.5);
  });

  it('pass alone gives negative polarity', () => {
    const { polarity } = computePolarity(input({ actionTaken: 'pass', dwellMs: 1500 }));
    expect(polarity).toBeLessThan(0);
  });

  it('full negative bottoms near -1', () => {
    const { polarity } = computePolarity(input({
      actionTaken: 'pass',
      dwellMs: 30_000,
      bioExpanded: true,
      photoSwipeCount: 20,
    }));
    expect(polarity).toBeGreaterThanOrEqual(-1);
    expect(polarity).toBeLessThan(-0.5);
  });
});

describe('computePolarity — neutral / weak', () => {
  it('short dwell + no action → polarity near 0', () => {
    const { polarity } = computePolarity(input({ dwellMs: 500 }));
    expect(Math.abs(polarity)).toBeLessThan(0.05);
  });

  it('no action + medium dwell → polarity near 0', () => {
    const { polarity } = computePolarity(input({ dwellMs: 3000, bioExpanded: false }));
    expect(Math.abs(polarity)).toBeLessThan(0.1);
  });

  it('return visit alone (no action) does NOT flip polarity strongly positive', () => {
    const { polarity } = computePolarity(input({
      dwellMs: 2000,
      returnVisit: true,
      returnCount: 3,
    }));
    // return contributes +0.15 max — confirm we stay sub-strong-positive
    expect(polarity).toBeLessThan(0.4);
  });
});

describe('computePolarity — bounds & confidence', () => {
  it('polarity is bounded to [-1, +1] on extreme inputs', () => {
    const a = computePolarity(input({
      actionTaken: 'like', dwellMs: 1e9, bioExpanded: true,
      photoSwipeCount: 1e6, returnVisit: true, returnCount: 1e6,
    }));
    const b = computePolarity(input({
      actionTaken: 'pass', dwellMs: 1e9, bioExpanded: true,
      photoSwipeCount: 1e6,
    }));
    expect(a.polarity).toBeLessThanOrEqual(1);
    expect(a.polarity).toBeGreaterThanOrEqual(-1);
    expect(b.polarity).toBeLessThanOrEqual(1);
    expect(b.polarity).toBeGreaterThanOrEqual(-1);
  });

  it('confidence is in [0,1]', () => {
    const { confidence } = computePolarity(input({
      actionTaken: 'like', dwellMs: 1e6, bioExpanded: true,
    }));
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('confidence is higher with bio expand than without', () => {
    const a = computePolarity(input({ actionTaken: 'like', dwellMs: 3000, bioExpanded: true }));
    const b = computePolarity(input({ actionTaken: 'like', dwellMs: 3000, bioExpanded: false }));
    expect(a.confidence).toBeGreaterThan(b.confidence);
  });

  it('confidence rises with dwell', () => {
    const a = computePolarity(input({ dwellMs: 500, bioExpanded: true }));
    const b = computePolarity(input({ dwellMs: 5000, bioExpanded: true }));
    expect(b.confidence).toBeGreaterThan(a.confidence);
  });
});

describe('computePolarity — symmetry & determinism', () => {
  it('like vs pass is sign-symmetric on action only', () => {
    const a = computePolarity(input({ actionTaken: 'like', dwellMs: 2000 }));
    const b = computePolarity(input({ actionTaken: 'pass', dwellMs: 2000 }));
    expect(a.polarity).toBeCloseTo(-b.polarity, 5);
  });

  it('determinism: identical inputs → identical outputs', () => {
    const i = input({ actionTaken: 'like', dwellMs: 4000, bioExpanded: true, photoSwipeCount: 2 });
    expect(computePolarity(i)).toEqual(computePolarity(i));
  });
});
