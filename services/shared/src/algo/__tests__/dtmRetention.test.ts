import { describe, it, expect } from 'vitest';
import {
  dtmRetentionTier,
  dtmErasurePlan,
  dtmFieldsToErase,
} from '../dtmRetention';

describe('dtmRetentionTier', () => {
  it('classifies raw answer text as erase', () => {
    expect(dtmRetentionTier('rawAnswerText')).toBe('erase');
  });
  it('classifies derived vector as erase (personal data)', () => {
    expect(dtmRetentionTier('topicVector')).toBe('erase');
  });
  it('classifies cohort assignment as rotate', () => {
    expect(dtmRetentionTier('cohortAssignment')).toBe('rotate');
  });
  it('classifies consent audit log as retain (legal requirement)', () => {
    expect(dtmRetentionTier('consentAuditLog')).toBe('retain');
  });
});

describe('dtmErasurePlan', () => {
  it('covers every classified field exactly once', () => {
    const plan = dtmErasurePlan();
    const fields = plan.map((a) => a.field);
    expect(new Set(fields).size).toBe(fields.length);
    expect(fields.length).toBeGreaterThanOrEqual(9);
  });
  it('every action has a valid tier', () => {
    for (const a of dtmErasurePlan()) {
      expect(['erase', 'rotate', 'retain']).toContain(a.tier);
    }
  });
});

describe('dtmFieldsToErase', () => {
  it('returns only fields whose tier is erase', () => {
    const fields = dtmFieldsToErase();
    expect(fields).toContain('rawAnswerText');
    expect(fields).toContain('topicVector');
    expect(fields).not.toContain('cohortAssignment');
    expect(fields).not.toContain('consentAuditLog');
  });
});
