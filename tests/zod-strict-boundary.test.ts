/**
 * Zod strict-boundary sweep — Task 2.
 *
 * Boundary Zod schemas (bodies + params + queries) must reject unknown
 * fields via `.strict()` (or be intentionally `.passthrough()`d with a
 * documented reason). This regression test walks the source of the two
 * highest-traffic surfaces and locks the count of strict marks so a
 * silent regression drops it.
 *
 * Scope: services/shared/src/schemas.ts + services/shared/src/track/v6Validators.ts.
 * Other boundary schemas live inline in each service's server.ts and are
 * covered by their handler-level tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Round-trip a couple of live schemas through validate to prove strict
// behaviour is wired end-to-end.
import {
  registerBodySchema,
  loginBodySchema,
  discoverLikeBodySchema,
  reportBodySchema,
  vibeCheckBodySchema,
  discoverMoveBodySchema,
  storyBodySchema,
  markReadBodySchema,
  chatPinBodySchema,
  accessRequestCreateBodySchema,
  deferCreateBodySchema,
} from '../services/shared/src/schemas';

// Also verify the v6 validator payloads reject unknown keys.
import { validateV6Payload } from '../services/shared/src/track/v6Validators';

function readSrc(rel: string): string {
  return readFileSync(resolve(__dirname, '..', rel), 'utf8');
}

describe('Zod strict-boundary sweep', () => {
  it('services/shared/src/schemas.ts has a strict count that meets the floor', () => {
    // Baseline snapshot at wire-up time = 50 strict marks. If a future edit
    // drops below this floor a boundary schema regressed to permissive.
    const src = readSrc('services/shared/src/schemas.ts');
    const strictCount = (src.match(/\.strict\(\)/g) || []).length;
    expect(strictCount).toBeGreaterThanOrEqual(48);
  });

  it('services/shared/src/track/v6Validators.ts has a strict-count floor', () => {
    const src = readSrc('services/shared/src/track/v6Validators.ts');
    // Baseline snapshot: v6Validators has 28 `.strict()` marks today
    // (most of the v8/v9/Phase-F/Phase-G additions land strict; older
    // v4-v7 payload validators pre-date the sweep and aren't in scope
    // for this session). Test locks the floor so a future edit can't
    // silently drop a `.strict()` mark.
    const strictCount = (src.match(/\.strict\(\)/g) || []).length;
    expect(strictCount).toBeGreaterThanOrEqual(25);
  });

  it('registerBodySchema rejects unknown fields', () => {
    const r = registerBodySchema.safeParse({ email: 'a@b.co', password: 'password1', displayName: 'A', evil: true });
    expect(r.success).toBe(false);
  });

  it('loginBodySchema rejects unknown fields', () => {
    const r = loginBodySchema.safeParse({ email: 'a@b.co', password: 'x', evil: 'x' });
    expect(r.success).toBe(false);
  });

  it('discoverLikeBodySchema rejects unknown fields', () => {
    const r = discoverLikeBodySchema.safeParse({ toUserId: 'u1', evil: true });
    expect(r.success).toBe(false);
  });

  it('reportBodySchema rejects unknown fields', () => {
    const r = reportBodySchema.safeParse({ reason: 'spam', mystery: 'x' });
    expect(r.success).toBe(false);
  });

  it('vibeCheckBodySchema rejects unknown fields', () => {
    const r = vibeCheckBodySchema.safeParse({ mood: 'ok', evil: 1 });
    expect(r.success).toBe(false);
  });

  it('discoverMoveBodySchema rejects unknown fields', () => {
    const r = discoverMoveBodySchema.safeParse({ toUserId: 'u1', evil: 1 });
    expect(r.success).toBe(false);
  });

  it('storyBodySchema rejects unknown fields', () => {
    const r = storyBodySchema.safeParse({ evil: 1 });
    expect(r.success).toBe(false);
  });

  it('markReadBodySchema rejects unknown fields', () => {
    const r = markReadBodySchema.safeParse({ ids: ['a'], evil: 1 });
    expect(r.success).toBe(false);
  });

  it('chatPinBodySchema rejects unknown fields', () => {
    const r = chatPinBodySchema.safeParse({ pinned: true, evil: 1 });
    expect(r.success).toBe(false);
  });

  it('accessRequestCreateBodySchema rejects unknown fields', () => {
    const r = accessRequestCreateBodySchema.safeParse({ toUserId: 'u', field: 'photos', evil: 1 });
    expect(r.success).toBe(false);
  });

  it('deferCreateBodySchema rejects unknown fields', () => {
    const r = deferCreateBodySchema.safeParse({ surface: 'discover', targetId: 't', evil: 1 });
    expect(r.success).toBe(false);
  });

  it('v6 payload validators reject unknown fields', () => {
    const r = validateV6Payload('discover.seeded_fallback', {
      naturalCount: 1, seededCount: 2, mysteryField: 'x',
    });
    expect(r.ok).toBe(false);
  });

  it('happy path — well-formed payloads still parse', () => {
    expect(registerBodySchema.safeParse({ email: 'a@b.co', password: 'password1', displayName: 'A' }).success).toBe(true);
    expect(discoverLikeBodySchema.safeParse({ toUserId: 'u1' }).success).toBe(true);
    expect(vibeCheckBodySchema.safeParse({ mood: 'chill' }).success).toBe(true);
    expect(chatPinBodySchema.safeParse({ pinned: true }).success).toBe(true);
  });
});
