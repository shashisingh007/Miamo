import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCuriosity,
  inquisitiveDtmTopics,
} from '../dtmTopicCuriosityIndex';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicCuriosityIndex', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicCuriosity([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => all untested', () => {
    for (const r of summarizeDtmTopicCuriosity([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'nope', speaker: 'partner', isQuestion: true },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores invalid speaker', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'values', speaker: 'bot' as any, isQuestion: true },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('partner-only questions => inquisitive', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'family', speaker: 'partner', isQuestion: true },
      { topic: 'family', speaker: 'partner', isQuestion: true },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.curiosityIndex).toBe(1);
    expect(f.band).toBe('inquisitive');
  });

  it('partner-only statements => flat', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'finance', speaker: 'partner', isQuestion: false },
      { topic: 'finance', speaker: 'partner', isQuestion: false },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('flat');
  });

  it('only self events => flat (no partner activity)', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'growth', speaker: 'self', isQuestion: true },
      { topic: 'growth', speaker: 'self', isQuestion: false },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.band).toBe('flat');
    expect(g.curiosityIndex).toBe(0);
  });

  it('mixed band — 1 question of 5 partner events => mild (0.2)', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'health', speaker: 'partner', isQuestion: true },
      { topic: 'health', speaker: 'partner', isQuestion: false },
      { topic: 'health', speaker: 'partner', isQuestion: false },
      { topic: 'health', speaker: 'partner', isQuestion: false },
      { topic: 'health', speaker: 'partner', isQuestion: false },
    ]);
    const h = r.find((x) => x.topic === 'health')!;
    expect(h.curiosityIndex).toBeCloseTo(0.2, 6);
    expect(h.band).toBe('mild');
  });

  it('engaged band at exactly 0.35', () => {
    const events: any[] = [];
    for (let i = 0; i < 35; i++) events.push({ topic: 'leisure', speaker: 'partner', isQuestion: true });
    for (let i = 0; i < 65; i++) events.push({ topic: 'leisure', speaker: 'partner', isQuestion: false });
    const r = summarizeDtmTopicCuriosity(events).find((x) => x.topic === 'leisure')!;
    expect(r.curiosityIndex).toBeCloseTo(0.35, 6);
    expect(r.band).toBe('engaged');
  });

  it('inquisitive boundary at 0.6', () => {
    const events: any[] = [];
    for (let i = 0; i < 60; i++) events.push({ topic: 'social', speaker: 'partner', isQuestion: true });
    for (let i = 0; i < 40; i++) events.push({ topic: 'social', speaker: 'partner', isQuestion: false });
    const r = summarizeDtmTopicCuriosity(events).find((x) => x.topic === 'social')!;
    expect(r.curiosityIndex).toBeCloseTo(0.6, 6);
    expect(r.band).toBe('inquisitive');
  });

  it('flat below 0.15', () => {
    const events: any[] = [];
    for (let i = 0; i < 10; i++) events.push({ topic: 'faith', speaker: 'partner', isQuestion: false });
    events.push({ topic: 'faith', speaker: 'partner', isQuestion: true });
    expect(
      summarizeDtmTopicCuriosity(events).find((x) => x.topic === 'faith')!.band
    ).toBe('flat');
  });

  it('counts split correctly between speakers', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'intimacy', speaker: 'partner', isQuestion: true },
      { topic: 'intimacy', speaker: 'self', isQuestion: true },
      { topic: 'intimacy', speaker: 'partner', isQuestion: false },
      { topic: 'intimacy', speaker: 'self', isQuestion: false },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(i.partnerQuestions).toBe(1);
    expect(i.selfQuestions).toBe(1);
    expect(i.partnerStatements).toBe(1);
    expect(i.selfStatements).toBe(1);
  });

  it('inquisitiveDtmTopics returns engaged + inquisitive only', () => {
    const events: any[] = [];
    for (let i = 0; i < 8; i++) events.push({ topic: 'family', speaker: 'partner', isQuestion: true });
    for (let i = 0; i < 2; i++) events.push({ topic: 'family', speaker: 'partner', isQuestion: false });
    for (let i = 0; i < 4; i++) events.push({ topic: 'finance', speaker: 'partner', isQuestion: true });
    for (let i = 0; i < 6; i++) events.push({ topic: 'finance', speaker: 'partner', isQuestion: false });
    events.push({ topic: 'conflict', speaker: 'partner', isQuestion: false });
    const rows = summarizeDtmTopicCuriosity(events);
    const inq = inquisitiveDtmTopics(rows);
    expect(inq).toContain('family');
    expect(inq).toContain('finance');
    expect(inq).not.toContain('conflict');
  });

  it('index undefined treated as statement', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'ambition', speaker: 'partner', isQuestion: undefined as any },
    ]);
    expect(r.find((x) => x.topic === 'ambition')!.partnerStatements).toBe(1);
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, speaker: 'partner', isQuestion: true });
    const rows = summarizeDtmTopicCuriosity(evs);
    for (const r of rows) expect(r.band).toBe('inquisitive');
  });

  it('curiosityIndex bounded [0,1]', () => {
    const r = summarizeDtmTopicCuriosity([
      { topic: 'autonomy', speaker: 'partner', isQuestion: true },
      { topic: 'autonomy', speaker: 'partner', isQuestion: false },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.curiosityIndex).toBeGreaterThanOrEqual(0);
    expect(a.curiosityIndex).toBeLessThanOrEqual(1);
  });
});
