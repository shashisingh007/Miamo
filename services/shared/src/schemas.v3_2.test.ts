import { describe, it, expect } from 'vitest';
import {
  showcaseCreateBodySchema,
  showcaseUpdateBodySchema,
  accessRequestCreateBodySchema,
  accessRequestDecisionBodySchema,
  dtmProfileUpdateBodySchema,
  SHOWCASE_CATEGORIES,
  ACCESS_FIELDS,
  SHOWCASE_LINK_ALLOWLIST,
} from './schemas';

describe('v3.2 showcaseCreateBodySchema', () => {
  it('accepts a link item', () => {
    const r = showcaseCreateBodySchema.safeParse({
      category: 'music', type: 'link', title: 'My EP', url: 'https://open.spotify.com/album/123',
    });
    expect(r.success).toBe(true);
  });

  it('rejects link item without url', () => {
    const r = showcaseCreateBodySchema.safeParse({ category: 'music', type: 'link', title: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown category', () => {
    const r = showcaseCreateBodySchema.safeParse({ category: 'astronomy', type: 'text', title: 't', body: 'b' });
    expect(r.success).toBe(false);
  });

  it('rejects title > 120 chars', () => {
    const r = showcaseCreateBodySchema.safeParse({
      category: 'writing', type: 'text', title: 'x'.repeat(121), body: 'b',
    });
    expect(r.success).toBe(false);
  });

  it('accepts voice with duration', () => {
    const r = showcaseCreateBodySchema.safeParse({
      category: 'music', type: 'voice', title: 'voice note', voiceUrl: 'https://x/y.opus', voiceDurationMs: 30000,
    });
    expect(r.success).toBe(true);
  });

  it('rejects voice over 120s', () => {
    const r = showcaseCreateBodySchema.safeParse({
      category: 'music', type: 'voice', title: 'too long', voiceUrl: 'https://x/y.opus', voiceDurationMs: 999999,
    });
    expect(r.success).toBe(false);
  });
});

describe('v3.2 showcaseUpdateBodySchema', () => {
  it('accepts partial update', () => {
    const r = showcaseUpdateBodySchema.safeParse({ pinned: true });
    expect(r.success).toBe(true);
  });
  it('rejects oversized title', () => {
    const r = showcaseUpdateBodySchema.safeParse({ title: 'x'.repeat(200) });
    expect(r.success).toBe(false);
  });
});

describe('v3.2 accessRequestCreateBodySchema', () => {
  it('accepts valid request', () => {
    const r = accessRequestCreateBodySchema.safeParse({
      toUserId: 'u_123', field: 'photos', message: 'please?',
    });
    expect(r.success).toBe(true);
  });
  it('rejects unknown field', () => {
    const r = accessRequestCreateBodySchema.safeParse({ toUserId: 'u', field: 'salary' });
    expect(r.success).toBe(false);
  });
  it('rejects oversize message', () => {
    const r = accessRequestCreateBodySchema.safeParse({
      toUserId: 'u', field: 'phone', message: 'x'.repeat(600),
    });
    expect(r.success).toBe(false);
  });
});

describe('v3.2 accessRequestDecisionBodySchema', () => {
  it('accepts empty body', () => {
    expect(accessRequestDecisionBodySchema.safeParse({}).success).toBe(true);
  });
  it('accepts reason', () => {
    expect(accessRequestDecisionBodySchema.safeParse({ reason: 'not yet' }).success).toBe(true);
  });
});

describe('v3.2 dtmProfileUpdateBodySchema', () => {
  it('accepts partial update', () => {
    const r = dtmProfileUpdateBodySchema.safeParse({ incomeBand: '10-20L', willingToRelocate: true });
    expect(r.success).toBe(true);
  });
  it('rejects bad maritalStatus', () => {
    const r = dtmProfileUpdateBodySchema.safeParse({ maritalStatus: 'engaged' });
    expect(r.success).toBe(false);
  });
  it('rejects bad expectedTimeline', () => {
    const r = dtmProfileUpdateBodySchema.safeParse({ expectedTimeline: 'someday' });
    expect(r.success).toBe(false);
  });
});

describe('v3.2 constants are stable', () => {
  it('SHOWCASE_CATEGORIES has 12 entries', () => {
    expect(SHOWCASE_CATEGORIES.length).toBe(12);
  });
  it('ACCESS_FIELDS has 9 entries', () => {
    expect(ACCESS_FIELDS.length).toBe(9);
  });
  it('SHOWCASE_LINK_ALLOWLIST contains spotify + github', () => {
    expect(SHOWCASE_LINK_ALLOWLIST).toContain('open.spotify.com');
    expect(SHOWCASE_LINK_ALLOWLIST).toContain('github.com');
  });
});
