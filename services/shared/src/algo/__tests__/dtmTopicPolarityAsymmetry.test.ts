import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicPolarityAsymmetry,
  negativeLeaningDtmTopics,
} from '../dtmTopicPolarityAsymmetry';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicPolarityAsymmetry', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicPolarityAsymmetry([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicPolarityAsymmetry([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([{ topic: 'nope', valence: 1 }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores NaN/Infinity valence', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'values', valence: NaN },
      { topic: 'values', valence: Infinity },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('all positive => positive band', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'family', valence: 0.8 },
      { topic: 'family', valence: 0.6 },
      { topic: 'family', valence: 0.9 },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.band).toBe('positive');
    expect(f.asymmetry).toBe(1);
  });

  it('all negative => negative band', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'conflict', valence: -0.8 },
      { topic: 'conflict', valence: -0.6 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('negative');
  });

  it('balanced pos/neg => balanced', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'intimacy', valence: 0.5 },
      { topic: 'intimacy', valence: -0.5 },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(i.asymmetry).toBe(0);
    expect(i.band).toBe('balanced');
  });

  it('mixed when asymmetry between 0.2 and 0.6', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'growth', valence: 0.5 },
      { topic: 'growth', valence: 0.5 },
      { topic: 'growth', valence: -0.5 },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.asymmetry).toBeCloseTo(1 / 3, 6);
    expect(g.band).toBe('mixed');
  });

  it('neutral-only band => mixed', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'leisure', valence: 0 },
      { topic: 'leisure', valence: 0.1 },
    ]);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(l.positiveCount).toBe(0);
    expect(l.negativeCount).toBe(0);
    expect(l.neutralCount).toBe(2);
    expect(l.band).toBe('mixed');
  });

  it('threshold customization', () => {
    const r = summarizeDtmTopicPolarityAsymmetry(
      [
        { topic: 'finance', valence: 0.05 },
        { topic: 'finance', valence: 0.05 },
      ],
      { positiveThreshold: 0.01, negativeThreshold: -0.01 }
    );
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('positive');
  });

  it('throws when thresholds invalid', () => {
    expect(() =>
      summarizeDtmTopicPolarityAsymmetry([], { positiveThreshold: -0.1, negativeThreshold: 0.1 })
    ).toThrow();
  });

  it('counts add up', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'social', valence: 0.5 },
      { topic: 'social', valence: -0.5 },
      { topic: 'social', valence: 0 },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.positiveCount + s.negativeCount + s.neutralCount).toBe(3);
  });

  it('asymmetry in [-1,1]', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'faith', valence: 0.9 },
      { topic: 'faith', valence: -0.9 },
      { topic: 'faith', valence: -0.9 },
    ]);
    const f = r.find((x) => x.topic === 'faith')!;
    expect(f.asymmetry).toBeGreaterThanOrEqual(-1);
    expect(f.asymmetry).toBeLessThanOrEqual(1);
  });

  it('negativeLeaningDtmTopics returns only negative band', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'conflict', valence: -0.9 },
      { topic: 'conflict', valence: -0.9 },
      { topic: 'family', valence: 0.9 },
    ]);
    const neg = negativeLeaningDtmTopics(r);
    expect(neg).toContain('conflict');
    expect(neg).not.toContain('family');
  });

  it('exactly at +0.6 asymmetry => positive', () => {
    const r = summarizeDtmTopicPolarityAsymmetry([
      { topic: 'ambition', valence: 0.8 },
      { topic: 'ambition', valence: 0.8 },
      { topic: 'ambition', valence: 0.8 },
      { topic: 'ambition', valence: 0.8 },
      { topic: 'ambition', valence: -0.8 },
    ]);
    const a = r.find((x) => x.topic === 'ambition')!;
    expect(a.asymmetry).toBeCloseTo(0.6, 6);
    expect(a.band).toBe('positive');
  });

  it('exactly -0.2 asymmetry => balanced boundary', () => {
    // 4 pos, 6 neg => (4-6)/10 = -0.2 ⇒ |0.2| <= 0.2 ⇒ balanced
    const samples = [
      ...Array(4).fill({ topic: 'autonomy', valence: 0.9 }),
      ...Array(6).fill({ topic: 'autonomy', valence: -0.9 }),
    ];
    const r = summarizeDtmTopicPolarityAsymmetry(samples as any);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.asymmetry).toBeCloseTo(-0.2, 6);
    expect(a.band).toBe('balanced');
  });

  it('all 16 topics processed independently', () => {
    const samples: any[] = [];
    for (const t of DTM_TOPIC_KEYS) samples.push({ topic: t, valence: 0.8 });
    const r = summarizeDtmTopicPolarityAsymmetry(samples);
    for (const row of r) expect(row.band).toBe('positive');
  });
});
