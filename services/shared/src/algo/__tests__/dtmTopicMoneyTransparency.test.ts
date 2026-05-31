import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicMoneyTransparency,
  concealedDtmTopics,
} from '../dtmTopicMoneyTransparency';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMoneyTransparency', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicMoneyTransparency([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    expect(summarizeDtmTopicMoneyTransparency([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('shared-statement => transparent', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'shared-statement' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('transparent');
  });

  it('volunteered-detail => transparent', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'volunteered-detail' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('transparent');
  });

  it('on-request (0.55) => open', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'on-request' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('open');
  });

  it('partial-disclose => guarded', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'partial-disclose' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('guarded');
  });

  it('concealed => concealed', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'concealed' }]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('concealed');
  });

  it('mixed averages: shared + concealed => 0.5 => guarded', () => {
    const r = summarizeDtmTopicMoneyTransparency([
      { topic: 'finance', signal: 'shared-statement' },
      { topic: 'finance', signal: 'concealed' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('guarded');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'nope', signal: 'shared-statement' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicMoneyTransparency([{ topic: 'finance', signal: 'huh' as any }]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMoneyTransparency([
      { topic: 'finance', signal: 'shared-statement' },
      { topic: 'finance', signal: 'on-request' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.n).toBe(2);
  });

  it('concealedDtmTopics filters', () => {
    const r = summarizeDtmTopicMoneyTransparency([
      { topic: 'finance', signal: 'concealed' },
      { topic: 'family', signal: 'shared-statement' },
    ]);
    const c = concealedDtmTopics(r);
    expect(c).toHaveLength(1);
    expect(c[0].topic).toBe('finance');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicMoneyTransparency([
      { topic: 'finance', signal: 'shared-statement' },
      { topic: 'family', signal: 'concealed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicMoneyTransparency([
      { topic: 'future', signal: 'shared-statement' },
      { topic: 'values', signal: 'concealed' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
