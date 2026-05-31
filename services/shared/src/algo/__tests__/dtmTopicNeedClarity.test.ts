import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicNeedClarity,
  silentDtmTopics,
} from '../dtmTopicNeedClarity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNeedClarity', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicNeedClarity([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicNeedClarity([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('concrete-ask => explicit', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'concrete-ask' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('explicit');
  });

  it('feeling-named => clear', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'feeling-named' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('clear');
  });

  it('vague-hint => vague', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'vague-hint' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('vague');
  });

  it('mind-read-expected => silent', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'mind-read-expected' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('silent');
  });

  it('silent => silent', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'silent' }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.band).toBe('silent');
  });

  it('mixed averages', () => {
    const rows = summarizeDtmTopicNeedClarity([
      { topic: 'intimacy', level: 'concrete-ask' },
      { topic: 'intimacy', level: 'silent' },
    ]);
    const r = rows.find((x) => x.topic === 'intimacy')!;
    expect(r.score).toBeCloseTo(0.5, 5);
    expect(r.band).toBe('vague');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'nope', level: 'concrete-ask' }]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown level', () => {
    const rows = summarizeDtmTopicNeedClarity([{ topic: 'intimacy', level: 'wat' as any }]);
    expect(rows.find((r) => r.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicNeedClarity([
      { topic: 'intimacy', level: 'concrete-ask' },
      { topic: 'intimacy', level: 'feeling-named' },
      { topic: 'family', level: 'silent' },
    ]);
    expect(rows.find((r) => r.topic === 'intimacy')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('silentDtmTopics filters', () => {
    const rows = summarizeDtmTopicNeedClarity([
      { topic: 'intimacy', level: 'silent' },
      { topic: 'family', level: 'concrete-ask' },
    ]);
    const s = silentDtmTopics(rows);
    expect(s).toHaveLength(1);
    expect(s[0].topic).toBe('intimacy');
  });

  it('scores bounded in [0,1]', () => {
    const rows = summarizeDtmTopicNeedClarity([
      { topic: 'intimacy', level: 'concrete-ask' },
      { topic: 'family', level: 'silent' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicNeedClarity([
      { topic: 'future', level: 'concrete-ask' },
      { topic: 'values', level: 'silent' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
