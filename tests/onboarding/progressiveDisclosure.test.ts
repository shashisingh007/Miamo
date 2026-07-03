/**
 * progressiveDisclosure — G.18 unit tests.
 *
 * Pure function, no DB — one test per rule locks the gate in place so a
 * silent refactor of the switch statement can't accidentally re-expose
 * a feature (or hide a v1 feature).
 */

import { describe, it, expect } from 'vitest';
import {
  shouldShowFeature,
  daysSinceSignup,
  isProgressiveDisclosureEnabled,
  filterNavByDisclosure,
  NAV_HREF_GATE,
  type DisclosureUser,
} from '../../services/web/src/lib/progressiveDisclosure';

const now = new Date('2026-07-02T12:00:00Z');

function u(overrides: Partial<DisclosureUser> = {}): DisclosureUser {
  return {
    matchCount: 0,
    signupAt: '2026-07-02T00:00:00Z',
    intent: null,
    onboardingComplete: false,
    seriousModeEnabled: false,
    ...overrides,
  };
}

describe('daysSinceSignup', () => {
  it('returns 0 for a same-instant signup', () => {
    expect(daysSinceSignup({ signupAt: now }, now)).toBe(0);
  });

  it('returns positive days for an older signup', () => {
    expect(daysSinceSignup({ signupAt: '2026-06-25T12:00:00Z' }, now)).toBe(7);
  });

  it('returns Infinity when signupAt is missing', () => {
    expect(daysSinceSignup({ signupAt: null }, now)).toBe(Infinity);
    expect(daysSinceSignup({ signupAt: 'not-a-date' }, now)).toBe(Infinity);
  });
});

describe('shouldShowFeature — dtm', () => {
  it('hides DTM for a 0-match user without seriousMode', () => {
    expect(shouldShowFeature(u({ matchCount: 0, seriousModeEnabled: false }), 'dtm', now)).toBe(false);
  });

  it('shows DTM once the user has ≥ 1 match', () => {
    expect(shouldShowFeature(u({ matchCount: 1 }), 'dtm', now)).toBe(true);
  });

  it('shows DTM when seriousModeEnabled even without matches', () => {
    expect(shouldShowFeature(u({ matchCount: 0, seriousModeEnabled: true }), 'dtm', now)).toBe(true);
  });
});

describe('shouldShowFeature — family-brief', () => {
  it('hides for intent=exploring', () => {
    expect(shouldShowFeature(u({ intent: 'exploring' }), 'family-brief', now)).toBe(false);
  });

  it('shows for intent=serious', () => {
    expect(shouldShowFeature(u({ intent: 'serious' }), 'family-brief', now)).toBe(true);
  });

  it('shows for intent=dtm', () => {
    expect(shouldShowFeature(u({ intent: 'dtm' }), 'family-brief', now)).toBe(true);
  });

  it('hides for intent=casual', () => {
    expect(shouldShowFeature(u({ intent: 'casual' }), 'family-brief', now)).toBe(false);
  });

  it('hides when intent is null (unknown)', () => {
    expect(shouldShowFeature(u({ intent: null }), 'family-brief', now)).toBe(false);
  });
});

describe('shouldShowFeature — anti-ghost + ai-match', () => {
  it('anti-ghost hides < 3 matches', () => {
    expect(shouldShowFeature(u({ matchCount: 2 }), 'anti-ghost', now)).toBe(false);
    expect(shouldShowFeature(u({ matchCount: 3 }), 'anti-ghost', now)).toBe(true);
  });

  it('ai-match hides < 3 matches', () => {
    expect(shouldShowFeature(u({ matchCount: 2 }), 'ai-match', now)).toBe(false);
    expect(shouldShowFeature(u({ matchCount: 3 }), 'ai-match', now)).toBe(true);
  });
});

describe('shouldShowFeature — weekly-top-10', () => {
  it('hides users with < 7 days of tenure', () => {
    expect(shouldShowFeature(u({ signupAt: '2026-06-29T12:00:00Z' }), 'weekly-top-10', now)).toBe(false); // 3 days
  });

  it('shows users with ≥ 7 days', () => {
    expect(shouldShowFeature(u({ signupAt: '2026-06-25T12:00:00Z' }), 'weekly-top-10', now)).toBe(true); // 7 days
  });
});

describe('shouldShowFeature — creativity-earn', () => {
  it('shows when onboarding is NOT complete (nudge to finish)', () => {
    expect(shouldShowFeature(u({ onboardingComplete: false }), 'creativity-earn', now)).toBe(true);
  });

  it('hides when onboarding is complete (nudge no longer useful)', () => {
    expect(shouldShowFeature(u({ onboardingComplete: true }), 'creativity-earn', now)).toBe(false);
  });
});

describe('shouldShowFeature — vibe-check', () => {
  it('always shows regardless of state', () => {
    expect(shouldShowFeature(u({ matchCount: 0, onboardingComplete: false }), 'vibe-check', now)).toBe(true);
    expect(shouldShowFeature(u({ matchCount: 999, onboardingComplete: true }), 'vibe-check', now)).toBe(true);
  });
});

// ─── Task 1a wiring — layout gate helpers ────────────────────────
describe('isProgressiveDisclosureEnabled', () => {
  it('is OFF by default (v1 behaviour: every feature always visible)', () => {
    expect(isProgressiveDisclosureEnabled({})).toBe(false);
  });
  it('accepts the bare flag (server-side / SSR path)', () => {
    expect(isProgressiveDisclosureEnabled({ FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED: '1' })).toBe(true);
  });
  it('accepts the NEXT_PUBLIC_ client flag', () => {
    expect(isProgressiveDisclosureEnabled({ NEXT_PUBLIC_FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED: '1' })).toBe(true);
  });
  it('rejects any other truthy value', () => {
    expect(isProgressiveDisclosureEnabled({ FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED: 'true' })).toBe(false);
    expect(isProgressiveDisclosureEnabled({ FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED: '0' })).toBe(false);
  });
});

describe('NAV_HREF_GATE', () => {
  it('gates DTM under both /serious-mode and /dtm', () => {
    expect(NAV_HREF_GATE['/serious-mode']).toBe('dtm');
    expect(NAV_HREF_GATE['/dtm']).toBe('dtm');
  });
  it('gates AI Match, Vibe Check, and Creativity', () => {
    expect(NAV_HREF_GATE['/ai-match']).toBe('ai-match');
    expect(NAV_HREF_GATE['/vibe-check']).toBe('vibe-check');
    expect(NAV_HREF_GATE['/creativity']).toBe('creativity-earn');
  });
});

describe('filterNavByDisclosure', () => {
  const items = [
    { href: '/discover' }, { href: '/matches' }, { href: '/messages' },
    { href: '/serious-mode' }, { href: '/ai-match' }, { href: '/creativity' },
    { href: '/vibe-check' }, { href: '/settings' },
  ] as const;

  it('when disabled or user missing: returns items untouched (v1 behaviour)', () => {
    expect(filterNavByDisclosure(items, null, { enabled: false }).length).toBe(items.length);
    expect(filterNavByDisclosure(items, null, { enabled: true }).length).toBe(items.length);
    expect(filterNavByDisclosure(items, u(), { enabled: false }).length).toBe(items.length);
  });

  it('when enabled + fresh user: hides DTM (0 matches), AI Match, Creativity gates', () => {
    const out = filterNavByDisclosure(items, u({ matchCount: 0, onboardingComplete: true }), { enabled: true, now });
    const hrefs = out.map(i => i.href);
    expect(hrefs).toContain('/discover');
    expect(hrefs).toContain('/matches');
    expect(hrefs).toContain('/vibe-check'); // always visible
    expect(hrefs).not.toContain('/serious-mode'); // dtm gate: 0 matches
    expect(hrefs).not.toContain('/ai-match'); // ai-match gate: < 3 matches
    expect(hrefs).not.toContain('/creativity'); // creativity-earn: hidden when onboarding complete
  });

  it('when enabled + veteran user: reveals gated items', () => {
    const out = filterNavByDisclosure(items, u({ matchCount: 5, onboardingComplete: false, intent: 'serious' }), { enabled: true, now });
    const hrefs = out.map(i => i.href);
    expect(hrefs).toContain('/serious-mode');
    expect(hrefs).toContain('/ai-match');
    expect(hrefs).toContain('/creativity'); // onboarding not complete → nudge visible
  });

  it('never mutates the input array', () => {
    const before = items.slice();
    filterNavByDisclosure(items, u({ matchCount: 0 }), { enabled: true, now });
    expect(items).toEqual(before);
  });
});
