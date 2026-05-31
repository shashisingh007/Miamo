import { describe, it, expect } from 'vitest';
import {
  isV6Event, validateV6Payload, V6_VALIDATORS,
  NavRouteSchema, FocusElementSchema, IntentDwellSchema, SessionSummarySchema,
  AttentionIdleExitSchema, FilterHesitationSchema, MsgVoiceRerecordSchema,
  NotifLookNoActSchema, DtmPartialAbandonSchema, ProfileSelfViewDwellSchema,
  AttentionIdleEnterSchema,
} from '../v6Validators';

describe('isV6Event', () => {
  it('recognises every v6 name in V6_VALIDATORS', () => {
    for (const name of Object.keys(V6_VALIDATORS)) {
      expect(isV6Event(name)).toBe(true);
    }
  });
  it('rejects unknown / v4 / v5 events', () => {
    expect(isV6Event('page.view')).toBe(false);
    expect(isV6Event('discover.swipe')).toBe(false);
    expect(isV6Event('made.up')).toBe(false);
  });
});

describe('NavRouteSchema', () => {
  it('accepts path-only', () => {
    expect(NavRouteSchema.safeParse({ path: '/discover' }).success).toBe(true);
  });
  it('accepts to-only', () => {
    expect(NavRouteSchema.safeParse({ to: '/profile' }).success).toBe(true);
  });
  it('rejects empty object (needs path OR to)', () => {
    expect(NavRouteSchema.safeParse({}).success).toBe(false);
  });
});

describe('FocusElementSchema', () => {
  it('requires route + elementId', () => {
    expect(FocusElementSchema.safeParse({}).success).toBe(false);
    expect(FocusElementSchema.safeParse({ route: '/', elementId: 'a' }).success).toBe(true);
  });
  it('rejects empty strings', () => {
    expect(FocusElementSchema.safeParse({ route: '', elementId: 'x' }).success).toBe(false);
  });
});

describe('IntentDwellSchema', () => {
  it('requires route + dwellMs', () => {
    expect(IntentDwellSchema.safeParse({ route: '/' }).success).toBe(false);
    expect(IntentDwellSchema.safeParse({ route: '/', dwellMs: 1500 }).success).toBe(true);
  });
  it('rejects dwellMs over the 24h cap', () => {
    const tooBig = 25 * 60 * 60 * 1000;
    expect(IntentDwellSchema.safeParse({ route: '/', dwellMs: tooBig }).success).toBe(false);
  });
  it('rejects negative dwellMs', () => {
    expect(IntentDwellSchema.safeParse({ route: '/', dwellMs: -10 }).success).toBe(false);
  });
});

describe('SessionSummarySchema', () => {
  it('accepts minimal payload', () => {
    expect(SessionSummarySchema.safeParse({
      sessionId: 'abc', durationMs: 30_000,
    }).success).toBe(true);
  });
  it('rejects missing sessionId', () => {
    expect(SessionSummarySchema.safeParse({ durationMs: 1000 }).success).toBe(false);
  });
});

describe('AttentionIdleEnterSchema / ExitSchema', () => {
  it('idle.enter accepts {} and enum reason', () => {
    expect(AttentionIdleEnterSchema.safeParse({}).success).toBe(true);
    expect(AttentionIdleEnterSchema.safeParse({ reason: 'inactivity' }).success).toBe(true);
    expect(AttentionIdleEnterSchema.safeParse({ reason: 'wat' }).success).toBe(false);
  });
  it('idle.exit accepts {} and a number idleMs', () => {
    expect(AttentionIdleExitSchema.safeParse({}).success).toBe(true);
    expect(AttentionIdleExitSchema.safeParse({ idleMs: 1234 }).success).toBe(true);
  });
});

describe('FilterHesitationSchema', () => {
  it('requires filter + hesitationMs', () => {
    expect(FilterHesitationSchema.safeParse({ filter: 'age', hesitationMs: 500 }).success).toBe(true);
    expect(FilterHesitationSchema.safeParse({ filter: 'age' }).success).toBe(false);
  });
});

describe('MsgVoiceRerecordSchema', () => {
  it('clamps attempt to [1, 20]', () => {
    expect(MsgVoiceRerecordSchema.safeParse({ threadId: 't', attempt: 0 }).success).toBe(false);
    expect(MsgVoiceRerecordSchema.safeParse({ threadId: 't', attempt: 21 }).success).toBe(false);
    expect(MsgVoiceRerecordSchema.safeParse({ threadId: 't', attempt: 3 }).success).toBe(true);
  });
});

describe('NotifLookNoActSchema', () => {
  it('accepts a known channel', () => {
    expect(NotifLookNoActSchema.safeParse({ notifId: 'n', dwellMs: 100, channel: 'push' }).success).toBe(true);
  });
  it('rejects an unknown channel', () => {
    expect(NotifLookNoActSchema.safeParse({ notifId: 'n', dwellMs: 100, channel: 'sms' }).success).toBe(false);
  });
});

describe('DtmPartialAbandonSchema', () => {
  it('rejects zero totalQuestions (must be positive)', () => {
    expect(DtmPartialAbandonSchema.safeParse({ questionsAnswered: 0, totalQuestions: 0 }).success).toBe(false);
  });
  it('accepts valid partial', () => {
    expect(DtmPartialAbandonSchema.safeParse({ questionsAnswered: 3, totalQuestions: 10 }).success).toBe(true);
  });
});

describe('ProfileSelfViewDwellSchema', () => {
  it('requires dwellMs', () => {
    expect(ProfileSelfViewDwellSchema.safeParse({}).success).toBe(false);
    expect(ProfileSelfViewDwellSchema.safeParse({ dwellMs: 4000 }).success).toBe(true);
  });
});

describe('validateV6Payload', () => {
  it('returns ok:true for valid payload', () => {
    const r = validateV6Payload('nav.route', { path: '/x' });
    expect(r.ok).toBe(true);
  });
  it('returns ok:false for invalid payload', () => {
    const r = validateV6Payload('nav.route', {});
    expect(r.ok).toBe(false);
  });
  it('returns ok:false for non-v6 event name', () => {
    const r = validateV6Payload('page.view', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('not a v6 event');
  });
});
