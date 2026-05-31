import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHumility,
  rigidHumilityDtmTopics,
} from '../dtmTopicHumilityIndex';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicHumilityIndex', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicHumility([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicHumility([])) expect(r.band).toBe('untested');
  });

  it('all admit-wrong => humble', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'values', signal: 'admit-wrong' },
      { topic: 'values', signal: 'admit-wrong' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('humble');
  });

  it('all dismiss => rigid', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'conflict', signal: 'dismiss' },
      { topic: 'conflict', signal: 'dismiss' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('rigid');
  });

  it('all double-down => rigid', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'finance', signal: 'double-down' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('rigid');
  });

  it('all concede-point => humble', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'family', signal: 'concede-point' },
      { topic: 'family', signal: 'concede-point' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('humble');
  });

  it('all ask-curious => open', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'growth', signal: 'ask-curious' },
      { topic: 'growth', signal: 'ask-curious' },
    ]);
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('open');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'social', signal: 'admit-wrong' },
      { topic: 'social', signal: 'concede-point' },
      { topic: 'social', signal: 'ask-curious' },
      { topic: 'social', signal: 'double-down' },
      { topic: 'social', signal: 'dismiss' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(5);
    expect(s.admit).toBe(1);
    expect(s.dismiss).toBe(1);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicHumility([{ topic: 'nope', signal: 'admit-wrong' }]);
    for (const row of r) expect(row.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicHumility([{ topic: 'values', signal: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('admit cancels dismiss', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'health', signal: 'admit-wrong' },
      { topic: 'health', signal: 'dismiss' },
    ]);
    // (1 + -1)/2 = 0 -> (0+1)/2 = 0.5 -> guarded
    expect(r.find((x) => x.topic === 'health')!.band).toBe('guarded');
  });

  it('humilityScore in [0,1]', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'autonomy', signal: 'ask-curious' },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.humilityScore).toBeGreaterThanOrEqual(0);
    expect(a.humilityScore).toBeLessThanOrEqual(1);
  });

  it('rigidHumilityDtmTopics filter', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'parenting', signal: 'dismiss' },
      { topic: 'faith', signal: 'admit-wrong' },
    ]);
    const rigid = rigidHumilityDtmTopics(r);
    expect(rigid).toContain('parenting');
    expect(rigid).not.toContain('faith');
  });

  it('all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'admit-wrong' });
    for (const r of summarizeDtmTopicHumility(evs)) expect(r.band).toBe('humble');
  });

  it('mixed concede + double-down lands guarded', () => {
    const r = summarizeDtmTopicHumility([
      { topic: 'leisure', signal: 'concede-point' },
      { topic: 'leisure', signal: 'double-down' },
    ]);
    // (0.7-0.7)/2 = 0 -> 0.5 -> guarded
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('guarded');
  });
});
