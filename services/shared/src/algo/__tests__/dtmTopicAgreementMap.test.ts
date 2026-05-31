import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAgreement } from '../dtmTopicAgreementMap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicAgreementMap', () => {
  it('rows match DTM order and length', () => {
    const s = summarizeDtmTopicAgreement({ self: new Map(), other: new Map() });
    expect(s.rows.length).toBe(DTM_TOPIC_KEYS.length);
    expect(s.rows[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('two empty maps -> perfect agreement', () => {
    const s = summarizeDtmTopicAgreement({ self: new Map(), other: new Map() });
    expect(s.overall).toBe(1);
    expect(s.rows.every((r) => r.band === 'aligned')).toBe(true);
  });

  it('identical vectors -> aligned + overall 1', () => {
    const self = new Map(DTM_TOPIC_KEYS.map((k) => [k, 0.5] as const));
    const other = new Map(DTM_TOPIC_KEYS.map((k) => [k, 0.5] as const));
    const s = summarizeDtmTopicAgreement({ self, other });
    expect(s.overall).toBe(1);
  });

  it('opposite poles -> divergent + delta=2 + agreement=0', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['values', 1]]),
      other: new Map([['values', -1]]),
    });
    const row = s.rows.find((r) => r.topic === 'values')!;
    expect(row.delta).toBe(2);
    expect(row.agreement).toBe(0);
    expect(row.band).toBe('divergent');
  });

  it('small delta -> aligned', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['family', 0.5]]),
      other: new Map([['family', 0.6]]),
    });
    expect(s.rows.find((r) => r.topic === 'family')!.band).toBe('aligned');
  });

  it('mixed band between thresholds', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['faith', 0.4]]),
      other: new Map([['faith', -0.4]]),
    });
    // delta=0.8 -> agreement=0.6 -> mixed
    expect(s.rows.find((r) => r.topic === 'faith')!.band).toBe('mixed');
  });

  it('clamps out-of-range', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['ambition', 5]]),
      other: new Map([['ambition', -5]]),
    });
    expect(s.rows.find((r) => r.topic === 'ambition')!.delta).toBe(2);
  });

  it('NaN treated as 0', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['social', NaN]]) as any,
      other: new Map([['social', 0.5]]),
    });
    expect(s.rows.find((r) => r.topic === 'social')!.delta).toBe(0.5);
  });

  it('overall is mean across all topics', () => {
    const self = new Map([['values', 1], ['family', 1]]);
    const other = new Map([['values', -1], ['family', -1]]);
    const s = summarizeDtmTopicAgreement({ self, other });
    // 2 topics agreement=0, 14 topics agreement=1
    const expected = 14 / DTM_TOPIC_KEYS.length;
    expect(s.overall).toBeCloseTo(expected, 5);
  });

  it('topDivergent returns top 3 by delta desc', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['values', 1], ['family', 1], ['faith', 1]]),
      other: new Map([['values', -1], ['family', -0.5], ['faith', 0.5]]),
    });
    expect(s.topDivergent.length).toBe(3);
    expect(s.topDivergent[0].topic).toBe('values');
    expect(s.topDivergent[0].delta).toBe(2);
  });

  it('topDivergent breaks ties by topic key', () => {
    const s = summarizeDtmTopicAgreement({
      self: new Map([['ambition', 1], ['values', 1]]),
      other: new Map([['ambition', -1], ['values', -1]]),
    });
    expect(s.topDivergent[0].topic).toBe('ambition');
  });
});
