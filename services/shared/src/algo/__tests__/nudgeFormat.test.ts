import { describe, it, expect } from 'vitest';
import { formatNudge } from '../nudgeFormat';
import type { DiscoverPolicy } from '../discoverPolicy';

const base: DiscoverPolicy = {
  candPoolMultiplier: 1.0, reciprocityBoost: 1.0, injectGentleNudge: null,
  detected: { windowShopping: false, zeroActionRecovery: false, ghostedSelf: false },
};

describe('formatNudge', () => {
  it('returns show=false when policy has no nudge', () => {
    const out = formatNudge(base);
    expect(out.show).toBe(false);
    expect(out.variant).toBeNull();
  });

  it('formats easy_reply nudge with /messages CTA', () => {
    const out = formatNudge({ ...base, injectGentleNudge: 'easy_reply' });
    expect(out.show).toBe(true);
    expect(out.variant).toBe('easy_reply');
    expect(out.cta.href).toBe('/messages');
    expect(out.headline.length).toBeGreaterThan(0);
  });

  it('formats who_liked_you nudge with /likes CTA', () => {
    const out = formatNudge({ ...base, injectGentleNudge: 'who_liked_you' });
    expect(out.show).toBe(true);
    expect(out.variant).toBe('who_liked_you');
    expect(out.cta.href).toBe('/likes');
  });

  it('always tags source=discover_policy for attribution', () => {
    expect(formatNudge(base).source).toBe('discover_policy');
    expect(formatNudge({ ...base, injectGentleNudge: 'easy_reply' }).source).toBe('discover_policy');
  });
});
