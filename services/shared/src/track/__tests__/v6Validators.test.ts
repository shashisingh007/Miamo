import { describe, it, expect } from 'vitest';
import {
  isV6Event, validateV6Payload, V6_VALIDATORS,
  NavRouteSchema, FocusElementSchema, IntentDwellSchema, SessionSummarySchema,
  AttentionIdleExitSchema, FilterHesitationSchema, MsgVoiceRerecordSchema,
  NotifLookNoActSchema, DtmPartialAbandonSchema, ProfileSelfViewDwellSchema,
  AttentionIdleEnterSchema,
  SafetyBlockSchema, SafetyReportSchema, DiscoverUnmatchSchema,
  MatchHoldSchema, MatchUnholdSchema,
  DtmQuestionSkipSchema, DtmAnswerReviseSchema,
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

// ─── v6.5 — safety + first-move + dtm extras ───────────────
describe('SafetyBlockSchema', () => {
  it('requires tid', () => {
    expect(SafetyBlockSchema.safeParse({}).success).toBe(false);
    expect(SafetyBlockSchema.safeParse({ tid: 'u1' }).success).toBe(true);
  });
  it('accepts an optional surface enum', () => {
    expect(SafetyBlockSchema.safeParse({ tid: 'u1', surface: 'messages' }).success).toBe(true);
    expect(SafetyBlockSchema.safeParse({ tid: 'u1', surface: 'nope' }).success).toBe(false);
  });
});

describe('SafetyReportSchema', () => {
  it('requires tid + valid reason', () => {
    expect(SafetyReportSchema.safeParse({ tid: 'u1' }).success).toBe(false);
    expect(SafetyReportSchema.safeParse({ tid: 'u1', reason: 'spam' }).success).toBe(true);
    expect(SafetyReportSchema.safeParse({ tid: 'u1', reason: 'sneaky' }).success).toBe(false);
  });
});

describe('DiscoverUnmatchSchema', () => {
  it('requires matchId', () => {
    expect(DiscoverUnmatchSchema.safeParse({}).success).toBe(false);
    expect(DiscoverUnmatchSchema.safeParse({ matchId: 'm1' }).success).toBe(true);
  });
});

describe('MatchHoldSchema / MatchUnholdSchema', () => {
  it('require matchId', () => {
    expect(MatchHoldSchema.safeParse({}).success).toBe(false);
    expect(MatchHoldSchema.safeParse({ matchId: 'm' }).success).toBe(true);
    expect(MatchUnholdSchema.safeParse({ matchId: 'm' }).success).toBe(true);
  });
});

describe('DtmQuestionSkipSchema', () => {
  it('requires topic + qid', () => {
    expect(DtmQuestionSkipSchema.safeParse({ topic: 't', qid: 'q' }).success).toBe(true);
    expect(DtmQuestionSkipSchema.safeParse({ topic: 't' }).success).toBe(false);
  });
});

describe('DtmAnswerReviseSchema', () => {
  it('requires topic + qid; from/to optional and string|number', () => {
    expect(DtmAnswerReviseSchema.safeParse({ topic: 't', qid: 'q' }).success).toBe(true);
    expect(DtmAnswerReviseSchema.safeParse({
      topic: 't', qid: 'q', fromValue: 1, toValue: 'high',
    }).success).toBe(true);
    expect(DtmAnswerReviseSchema.safeParse({
      topic: 't', qid: 'q', fromValue: { bad: true } as unknown as number,
    }).success).toBe(false);
  });
});

describe('validateV6Payload — v6.5 events', () => {
  it('routes safety.block through the right schema', () => {
    expect(validateV6Payload('safety.block', { tid: 'u' }).ok).toBe(true);
    expect(validateV6Payload('safety.block', {}).ok).toBe(false);
  });
  it('routes safety.report through the right schema', () => {
    expect(validateV6Payload('safety.report', { tid: 'u', reason: 'spam' }).ok).toBe(true);
    expect(validateV6Payload('safety.report', { tid: 'u' }).ok).toBe(false);
  });
  it('routes discover.unmatch through the right schema', () => {
    expect(validateV6Payload('discover.unmatch', { matchId: 'm' }).ok).toBe(true);
  });
  it('routes match.hold / match.unhold', () => {
    expect(validateV6Payload('match.hold', { matchId: 'm' }).ok).toBe(true);
    expect(validateV6Payload('match.unhold', { matchId: 'm' }).ok).toBe(true);
  });
  it('routes dtm.question_skip and dtm.answer_revise', () => {
    expect(validateV6Payload('dtm.question_skip', { topic: 't', qid: 'q' }).ok).toBe(true);
    expect(validateV6Payload('dtm.answer_revise', { topic: 't', qid: 'q' }).ok).toBe(true);
  });
});
