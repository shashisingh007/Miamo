import { describe, it, expect } from 'vitest';
import { filterDtmByConsent, isTopicShareable, DTM_SENSITIVE_TOPICS } from '../dtmConsentFilter';

describe('dtmConsentFilter', () => {
  it('sensitive topics blocked when not explicitly allowed', () => {
    for (const t of DTM_SENSITIVE_TOPICS) {
      expect(isTopicShareable(t, null)).toBe(false);
      expect(isTopicShareable(t, {})).toBe(false);
      expect(isTopicShareable(t, { [t]: false })).toBe(false);
    }
  });

  it('sensitive topics allowed when explicitly opted in', () => {
    expect(isTopicShareable('faith', { faith: true })).toBe(true);
    expect(isTopicShareable('intimacy', { intimacy: true })).toBe(true);
  });

  it('non-sensitive topics shown by default', () => {
    expect(isTopicShareable('values', null)).toBe(true);
    expect(isTopicShareable('communication', {})).toBe(true);
    expect(isTopicShareable('health', undefined)).toBe(true);
  });

  it('non-sensitive topics can be opted out', () => {
    expect(isTopicShareable('values', { values: false })).toBe(false);
  });

  it('filterDtmByConsent counts redactions', () => {
    const items = [
      { topic: 'values' as const, score: 1 },
      { topic: 'finance' as const, score: 1 },
      { topic: 'communication' as const, score: 1 },
      { topic: 'intimacy' as const, score: 1 },
    ];
    const r = filterDtmByConsent(items, { finance: true });
    expect(r.visible.map(i => i.topic)).toEqual(['values', 'finance', 'communication']);
    expect(r.redactedCount).toBe(1);
  });

  it('empty input -> empty output, zero redactions', () => {
    expect(filterDtmByConsent([], null)).toEqual({ visible: [], redactedCount: 0 });
  });

  it('preserves order of input', () => {
    const items = [
      { topic: 'leisure' as const },
      { topic: 'values' as const },
      { topic: 'communication' as const },
    ];
    const r = filterDtmByConsent(items, null);
    expect(r.visible.map(i => i.topic)).toEqual(['leisure', 'values', 'communication']);
  });

  it('all-sensitive without consent returns empty', () => {
    const items = DTM_SENSITIVE_TOPICS.map(t => ({ topic: t }));
    const r = filterDtmByConsent(items, null);
    expect(r.visible).toEqual([]);
    expect(r.redactedCount).toBe(DTM_SENSITIVE_TOPICS.length);
  });
});
