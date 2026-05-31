import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEmotionalSafety,
  unsafeDtmTopics,
} from '../dtmTopicEmotionalSafetyIndex';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicEmotionalSafetyIndex', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicEmotionalSafety([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => all untested', () => {
    for (const r of summarizeDtmTopicEmotionalSafety([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicEmotionalSafety([{ topic: 'nope', valence: 1 }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores non-finite valence', () => {
    const r = summarizeDtmTopicEmotionalSafety([{ topic: 'values', valence: NaN }]);
    expect(r.find((x) => x.topic === 'values')!.samples).toBe(0);
  });

  it('all positive, no ruptures => sanctuary', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'family', valence: 1 },
      { topic: 'family', valence: 1 },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.safetyScore).toBeGreaterThanOrEqual(0.9);
    expect(f.band).toBe('sanctuary');
  });

  it('all negative + ruptures + no repairs => unsafe', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'conflict', valence: -1, rupture: true, interruptions: 5 },
      { topic: 'conflict', valence: -1, rupture: true, interruptions: 4 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('unsafe');
  });

  it('neutral with repairs => guarded', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'growth', valence: 0, rupture: true, repairCount: 1 },
      { topic: 'growth', valence: 0, rupture: true, repairCount: 1 },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.band).toBe('guarded');
  });

  it('positive with occasional rupture but repairs => safe', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'intimacy', valence: 0.6, rupture: true, repairCount: 1 },
      { topic: 'intimacy', valence: 0.7 },
      { topic: 'intimacy', valence: 0.7 },
      { topic: 'intimacy', valence: 0.6 },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(['safe', 'sanctuary']).toContain(i.band);
  });

  it('repairRate=1 when no ruptures', () => {
    const r = summarizeDtmTopicEmotionalSafety([{ topic: 'leisure', valence: 0.5 }]);
    expect(r.find((x) => x.topic === 'leisure')!.repairRate).toBe(1);
  });

  it('repairRate capped at 1', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'finance', valence: 0, rupture: true, repairCount: 5 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.repairRate).toBe(1);
  });

  it('interruptionRate computed', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'social', valence: 0, interruptions: 2 },
      { topic: 'social', valence: 0, interruptions: 4 },
    ]);
    expect(r.find((x) => x.topic === 'social')!.interruptionRate).toBe(3);
  });

  it('ruptureRate computed', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'autonomy', valence: 0, rupture: true },
      { topic: 'autonomy', valence: 0 },
      { topic: 'autonomy', valence: 0 },
      { topic: 'autonomy', valence: 0 },
    ]);
    expect(r.find((x) => x.topic === 'autonomy')!.ruptureRate).toBe(0.25);
  });

  it('safetyScore in [0,1]', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'faith', valence: -1, rupture: true, interruptions: 10 },
    ]);
    const f = r.find((x) => x.topic === 'faith')!;
    expect(f.safetyScore).toBeGreaterThanOrEqual(0);
    expect(f.safetyScore).toBeLessThanOrEqual(1);
  });

  it('clamps valence beyond [-1,1]', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'ambition', valence: 10 },
      { topic: 'ambition', valence: -10 },
    ]);
    expect(r.find((x) => x.topic === 'ambition')!.meanValence).toBe(0);
  });

  it('unsafeDtmTopics returns unsafe + guarded', () => {
    const rows = summarizeDtmTopicEmotionalSafety([
      { topic: 'conflict', valence: -1, rupture: true, interruptions: 5 },
      { topic: 'growth', valence: 0, rupture: true, repairCount: 1 },
      { topic: 'family', valence: 1 },
    ]);
    const u = unsafeDtmTopics(rows);
    expect(u).toContain('conflict');
    expect(u).toContain('growth');
    expect(u).not.toContain('family');
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, valence: 1 });
    const rows = summarizeDtmTopicEmotionalSafety(evs);
    for (const r of rows) expect(r.band).toBe('sanctuary');
  });

  it('samples count tracked', () => {
    const r = summarizeDtmTopicEmotionalSafety([
      { topic: 'health', valence: 0.5 },
      { topic: 'health', valence: 0.5 },
      { topic: 'health', valence: 0.5 },
    ]);
    expect(r.find((x) => x.topic === 'health')!.samples).toBe(3);
  });
});
