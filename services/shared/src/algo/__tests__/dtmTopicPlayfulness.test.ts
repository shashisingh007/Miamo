import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicPlayfulness,
  causticDtmTopics,
} from '../dtmTopicPlayfulness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPlayfulness', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicPlayfulness([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicPlayfulness([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('inside-joke => playful', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'inside-joke' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('playful');
  });

  it('shared-laugh => playful', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'shared-laugh' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('playful');
  });

  it('banter => playful (0.925)', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'banter' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('playful');
  });

  it('serious-only => warm-ish (0.7)', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'serious-only' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('warm');
  });

  it('mockery => caustic', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'mockery' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('caustic');
  });

  it('sarcasm-cutting => caustic', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'sarcasm-cutting' }]);
    expect(rows.find((r) => r.topic === 'leisure')!.band).toBe('caustic');
  });

  it('balanced banter + mockery => flat', () => {
    const rows = summarizeDtmTopicPlayfulness([
      { topic: 'leisure', action: 'banter' },
      { topic: 'leisure', action: 'mockery' },
    ]);
    const r = rows.find((x) => x.topic === 'leisure')!;
    expect(r.score).toBeCloseTo((0.925 + 0) / 2, 5);
    expect(r.band).toBe('flat');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'nope', action: 'banter' }]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown action', () => {
    const rows = summarizeDtmTopicPlayfulness([{ topic: 'leisure', action: 'shrug' as any }]);
    expect(rows.find((r) => r.topic === 'leisure')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicPlayfulness([
      { topic: 'leisure', action: 'banter' },
      { topic: 'leisure', action: 'inside-joke' },
      { topic: 'family', action: 'mockery' },
    ]);
    expect(rows.find((r) => r.topic === 'leisure')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('causticDtmTopics filters', () => {
    const rows = summarizeDtmTopicPlayfulness([
      { topic: 'leisure', action: 'mockery' },
      { topic: 'family', action: 'inside-joke' },
    ]);
    const c = causticDtmTopics(rows);
    expect(c).toHaveLength(1);
    expect(c[0].topic).toBe('leisure');
  });

  it('scores bounded in [0,1]', () => {
    const rows = summarizeDtmTopicPlayfulness([
      { topic: 'leisure', action: 'inside-joke' },
      { topic: 'family', action: 'mockery' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicPlayfulness([
      { topic: 'future', action: 'banter' },
      { topic: 'values', action: 'mockery' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
