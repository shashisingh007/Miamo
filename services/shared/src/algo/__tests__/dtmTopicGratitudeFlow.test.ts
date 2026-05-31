import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicGratitudeFlow,
  criticalDtmTopics,
} from '../dtmTopicGratitudeFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudeFlow', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicGratitudeFlow([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicGratitudeFlow([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('thank-specific => thanking', () => {
    const rows = summarizeDtmTopicGratitudeFlow([{ topic: 'family', action: 'thank-specific' }]);
    expect(rows.find((r) => r.topic === 'family')!.band).toBe('thanking');
  });

  it('appreciate-effort => thanking (0.925)', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'appreciate-effort' },
    ]);
    expect(rows.find((r) => r.topic === 'family')!.band).toBe('thanking');
  });

  it('thank-generic => noticing (0.75)', () => {
    const rows = summarizeDtmTopicGratitudeFlow([{ topic: 'family', action: 'thank-generic' }]);
    expect(rows.find((r) => r.topic === 'family')!.band).toBe('noticing');
  });

  it('overlook => taking (0.25)', () => {
    const rows = summarizeDtmTopicGratitudeFlow([{ topic: 'family', action: 'overlook' }]);
    expect(rows.find((r) => r.topic === 'family')!.band).toBe('critical');
  });

  it('criticize => critical', () => {
    const rows = summarizeDtmTopicGratitudeFlow([{ topic: 'family', action: 'criticize' }]);
    expect(rows.find((r) => r.topic === 'family')!.band).toBe('critical');
  });

  it('mixed thank-specific + criticize => taking', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'thank-specific' },
      { topic: 'family', action: 'criticize' },
    ]);
    const r = rows.find((x) => x.topic === 'family')!;
    expect(r.score).toBeCloseTo(0.5, 5);
    expect(r.band).toBe('taking');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicGratitudeFlow([{ topic: 'nope', action: 'thank-specific' }]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown action', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'shrug' as any },
    ]);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'thank-specific' },
      { topic: 'family', action: 'thank-generic' },
      { topic: 'intimacy', action: 'criticize' },
    ]);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'intimacy')!.n).toBe(1);
  });

  it('criticalDtmTopics filters', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'criticize' },
      { topic: 'intimacy', action: 'thank-specific' },
    ]);
    const c = criticalDtmTopics(rows);
    expect(c).toHaveLength(1);
    expect(c[0].topic).toBe('family');
  });

  it('scores bounded in [0,1]', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'family', action: 'thank-specific' },
      { topic: 'intimacy', action: 'criticize' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicGratitudeFlow([
      { topic: 'future', action: 'thank-specific' },
      { topic: 'values', action: 'criticize' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
