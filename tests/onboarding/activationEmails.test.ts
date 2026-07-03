/**
 * activationEmails — G.18 pure schedule helper tests.
 *
 * The loop itself needs a Prisma client; instead of mocking Prisma we
 * unit-test the pure `dueTouchpoints()` function that drives which
 * touchpoints fire when. This is the piece a schedule regression would
 * silently break.
 */

import { describe, it, expect } from 'vitest';
import {
  dueTouchpoints,
  TOUCHPOINT_SCHEDULE,
  activationTitle,
  activationBody,
  templateForTouchpoint,
  isActivationEmailsEnabled,
  type Touchpoint,
} from '../../services/tracking-worker/src/activationEmails';

const signup = new Date('2026-07-01T00:00:00Z');

describe('TOUCHPOINT_SCHEDULE', () => {
  it('contains exactly 4 touchpoints in ascending order', () => {
    const entries = Object.entries(TOUCHPOINT_SCHEDULE).sort((a, b) => a[1] - b[1]);
    expect(entries.length).toBe(4);
    expect(entries.map(([k]) => k)).toEqual(['welcome', 'complete-profile', 'unread-matches', 'algorithm-tips']);
    // Rising hours.
    for (let i = 1; i < entries.length; i++) expect(entries[i][1]).toBeGreaterThan(entries[i - 1][1]);
  });
});

describe('dueTouchpoints', () => {
  it('fires welcome (0h) at signup instant', () => {
    const now = new Date(signup.getTime());
    expect(dueTouchpoints(signup, now, new Set())).toContain('welcome');
  });

  it('fires welcome + complete-profile at 24h', () => {
    const now = new Date(signup.getTime() + 24 * 60 * 60 * 1000);
    const due = dueTouchpoints(signup, now, new Set());
    expect(due).toContain('complete-profile');
    // Welcome likely still in the window; that's OK — dedupe is handled
    // outside via AuditLog. If already-sent is passed, welcome disappears.
    expect(dueTouchpoints(signup, now, new Set(['welcome']))).not.toContain('welcome');
  });

  it('fires algorithm-tips at 168h (day 7)', () => {
    const now = new Date(signup.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(dueTouchpoints(signup, now, new Set(['welcome', 'complete-profile', 'unread-matches']))).toContain('algorithm-tips');
  });

  it('never re-fires a touchpoint already in `alreadySent`', () => {
    const now = new Date(signup.getTime() + 10 * 24 * 60 * 60 * 1000);
    const due = dueTouchpoints(signup, now, new Set(['welcome', 'complete-profile', 'unread-matches', 'algorithm-tips']));
    expect(due).toEqual([]);
  });

  it('does not fire touchpoints from the future', () => {
    // 30 min post-signup: only welcome is due, not complete-profile.
    const now = new Date(signup.getTime() + 30 * 60 * 1000);
    const due = dueTouchpoints(signup, now, new Set());
    expect(due).toContain('welcome');
    expect(due).not.toContain('complete-profile');
    expect(due).not.toContain('unread-matches');
  });
});

describe('copy helpers', () => {
  it('every touchpoint has a non-empty title + body + template', () => {
    const tps: Touchpoint[] = ['welcome', 'complete-profile', 'unread-matches', 'algorithm-tips'];
    for (const tp of tps) {
      expect(activationTitle(tp).length).toBeGreaterThan(0);
      expect(activationBody(tp, 'Priya').length).toBeGreaterThan(20);
      // Body should personalize when a name is supplied.
      expect(activationBody(tp, 'Priya')).toMatch(/Priya/);
      // Template key returned matches touchpoint name.
      expect(templateForTouchpoint(tp)).toBe(tp);
    }
  });

  it('activationBody falls back to "there" when displayName is empty', () => {
    expect(activationBody('welcome', '')).toMatch(/there/);
  });
});

describe('isActivationEmailsEnabled', () => {
  it('is false when the env var is unset', () => {
    expect(isActivationEmailsEnabled({})).toBe(false);
  });
  it('is true only when the env var is exactly "1"', () => {
    expect(isActivationEmailsEnabled({ FEATURE_ACTIVATION_EMAILS_ENABLED: '1' })).toBe(true);
    expect(isActivationEmailsEnabled({ FEATURE_ACTIVATION_EMAILS_ENABLED: 'true' })).toBe(false);
    expect(isActivationEmailsEnabled({ FEATURE_ACTIVATION_EMAILS_ENABLED: '0' })).toBe(false);
  });
});
