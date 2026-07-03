import { describe, it, expect } from 'vitest';
import {
  computeDepth,
  ACCIDENTAL_CLICK_THRESHOLD_MS,
  type DepthInput,
} from '../v8/depthOfEngagement';

function input(overrides: Partial<DepthInput> = {}): DepthInput {
  return {
    dwellMs: 0,
    scrollDepth: 0,
    photoSwipeCount: 0,
    bioExpanded: false,
    returnCount: 0,
    undoFlag: false,
    photoZoom: false,
    screenshotTaken: false,
    openToCloseMs: 0,
    ...overrides,
  };
}

describe('computeDepth — hard filters', () => {
  it('accidental click (200ms open, no scroll, no actions) → depth = 0', () => {
    const d = computeDepth(input({
      openToCloseMs: 200,
      dwellMs: 200,
      scrollDepth: 0,
      photoSwipeCount: 0,
      bioExpanded: false,
    }));
    expect(d).toBe(0);
  });

  it('threshold is the documented 500ms constant', () => {
    expect(ACCIDENTAL_CLICK_THRESHOLD_MS).toBe(500);
  });

  it('accidental filter requires ALL four clauses to fire (bio expand defeats it)', () => {
    const d = computeDepth(input({
      openToCloseMs: 300,
      dwellMs: 300,
      bioExpanded: true,
    }));
    expect(d).toBeGreaterThan(0);
  });

  it('accidental filter requires ALL four clauses (photo swipe defeats it)', () => {
    const d = computeDepth(input({
      openToCloseMs: 300,
      dwellMs: 300,
      photoSwipeCount: 1,
    }));
    expect(d).toBeGreaterThan(0);
  });

  it('undoFlag → depth = 0.1 exactly', () => {
    const d = computeDepth(input({
      undoFlag: true,
      dwellMs: 8000,
      scrollDepth: 0.8,
      photoSwipeCount: 4,
      bioExpanded: true,
      returnCount: 2,
      openToCloseMs: 9000,
    }));
    expect(d).toBeCloseTo(0.1, 9);
  });
});

describe('computeDepth — weighted sum', () => {
  it('full inspection (10s dwell, 4 photos, bio, scroll 0.8) → > 0.7', () => {
    const d = computeDepth(input({
      dwellMs: 10_000,
      scrollDepth: 0.8,
      photoSwipeCount: 4,
      bioExpanded: true,
      openToCloseMs: 10_500,
    }));
    expect(d).toBeGreaterThan(0.7);
  });

  it('max-evidence saturates near 1.0', () => {
    const d = computeDepth(input({
      dwellMs: 60_000,
      scrollDepth: 1,
      photoSwipeCount: 10,
      bioExpanded: true,
      returnCount: 5,
      photoZoom: true,
      screenshotTaken: true,
      openToCloseMs: 61_000,
    }));
    expect(d).toBeGreaterThan(0.95);
    expect(d).toBeLessThanOrEqual(1);
  });

  it('bio expand alone (no other signal) gives the 0.20 coefficient', () => {
    const d = computeDepth(input({
      dwellMs: 200,
      bioExpanded: true,
      openToCloseMs: 1000,
    }));
    // dwell contribution is tiny (log1p(200)/log1p(15000) ≈ 0.55) and weighted 0.30,
    // so total is ≈ 0.20 (bio) + 0.30 * dwellTerm ≈ 0.36
    expect(d).toBeGreaterThan(0.20);
    expect(d).toBeLessThan(0.5);
  });

  it('photo zoom alone (no other signal) does not get below the accidental filter', () => {
    // dwellMs/openToCloseMs need to lift over the filter to make this case "legit"
    const d = computeDepth(input({
      photoZoom: true,
      dwellMs: 2000,
      openToCloseMs: 2000,
      scrollDepth: 0.1,
    }));
    expect(d).toBeGreaterThan(0);
    // zoom alone contributes 0.05; scroll 0.15*0.1=0.015; dwell ~ 0.30*0.79 ≈ 0.24
    expect(d).toBeLessThan(0.5);
  });

  it('screenshot adds positive credit', () => {
    const base = computeDepth(input({ dwellMs: 5000, openToCloseMs: 5000 }));
    const shot = computeDepth(input({ dwellMs: 5000, openToCloseMs: 5000, screenshotTaken: true }));
    expect(shot).toBeCloseTo(base + 0.05, 5);
  });
});

describe('computeDepth — monotonicity & bounds', () => {
  it('monotonic in dwellMs (other inputs fixed)', () => {
    const a = computeDepth(input({ dwellMs: 1000, openToCloseMs: 1000 }));
    const b = computeDepth(input({ dwellMs: 5000, openToCloseMs: 5000 }));
    const c = computeDepth(input({ dwellMs: 15000, openToCloseMs: 15000 }));
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('depth bounded to [0, 1] on extreme inputs', () => {
    const d = computeDepth(input({
      dwellMs: 1e9, scrollDepth: 1e6, photoSwipeCount: 1e6,
      bioExpanded: true, returnCount: 1e6, photoZoom: true, screenshotTaken: true,
      openToCloseMs: 1e9,
    }));
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });

  it('negative inputs do not break the function', () => {
    const d = computeDepth(input({
      dwellMs: -100, scrollDepth: -0.5, photoSwipeCount: -3,
      returnCount: -1, openToCloseMs: 1000,
    }));
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });

  it('scroll alone caps via clip01', () => {
    const d = computeDepth(input({ scrollDepth: 1.0, dwellMs: 2000, openToCloseMs: 2000 }));
    const sat = computeDepth(input({ scrollDepth: 1e6, dwellMs: 2000, openToCloseMs: 2000 }));
    expect(sat).toBeCloseTo(d, 5);
  });
});

describe('computeDepth — determinism', () => {
  it('identical inputs → identical output', () => {
    const i = input({
      dwellMs: 4000, scrollDepth: 0.5, photoSwipeCount: 2,
      bioExpanded: true, returnCount: 1, openToCloseMs: 5000,
    });
    expect(computeDepth(i)).toBe(computeDepth(i));
  });
});
