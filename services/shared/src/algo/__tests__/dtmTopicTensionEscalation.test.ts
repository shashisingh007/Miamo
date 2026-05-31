import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTensionEscalation,
  escalatingDtmTopics,
} from '../dtmTopicTensionEscalation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicTensionEscalation', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicTensionEscalation([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicTensionEscalation([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicTensionEscalation([{ topic: 'nope', ts: 0, intensity: 0.5 }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores non-finite intensity/ts', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'values', ts: 0, intensity: NaN },
      { topic: 'values', ts: NaN, intensity: 0.5 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('clamps intensity to [0,1]', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'values', ts: 0, intensity: 5 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.maxIntensity).toBe(1);
  });

  it('low intensity => calm', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'family', ts: 0, intensity: 0.1 },
      { topic: 'family', ts: 1, intensity: 0.15 },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('calm');
  });

  it('moderate mean => simmering', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'finance', ts: 0, intensity: 0.3 },
      { topic: 'finance', ts: 1, intensity: 0.3 },
      { topic: 'finance', ts: 2, intensity: 0.3 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('simmering');
  });

  it('rising slope > 0.15 => escalating', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'conflict', ts: 0, intensity: 0.1 },
      { topic: 'conflict', ts: 1, intensity: 0.5 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('escalating');
  });

  it('high mean alone => escalating', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'conflict', ts: 0, intensity: 0.5 },
      { topic: 'conflict', ts: 1, intensity: 0.5 },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('escalating');
  });

  it('very high mean => boiling', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'intimacy', ts: 0, intensity: 0.8 },
      { topic: 'intimacy', ts: 1, intensity: 0.7 },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('boiling');
  });

  it('peak >= 0.9 => boiling regardless of mean', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'autonomy', ts: 0, intensity: 0.1 },
      { topic: 'autonomy', ts: 1, intensity: 0.1 },
      { topic: 'autonomy', ts: 2, intensity: 0.95 },
    ]);
    expect(r.find((x) => x.topic === 'autonomy')!.band).toBe('boiling');
  });

  it('sorts by ts before computing slope', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'growth', ts: 2, intensity: 0.6 },
      { topic: 'growth', ts: 0, intensity: 0.1 },
      { topic: 'growth', ts: 1, intensity: 0.3 },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.escalationSlope).toBeCloseTo(0.25, 6);
  });

  it('single event => slope 0', () => {
    const r = summarizeDtmTopicTensionEscalation([{ topic: 'leisure', ts: 0, intensity: 0.3 }]);
    expect(r.find((x) => x.topic === 'leisure')!.escalationSlope).toBe(0);
  });

  it('events count tracked', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'social', ts: 0, intensity: 0.2 },
      { topic: 'social', ts: 1, intensity: 0.2 },
      { topic: 'social', ts: 2, intensity: 0.2 },
    ]);
    expect(r.find((x) => x.topic === 'social')!.events).toBe(3);
  });

  it('escalatingDtmTopics returns escalating + boiling', () => {
    const rows = summarizeDtmTopicTensionEscalation([
      { topic: 'conflict', ts: 0, intensity: 0.9 },
      { topic: 'conflict', ts: 1, intensity: 0.9 },
      { topic: 'finance', ts: 0, intensity: 0.5 },
      { topic: 'finance', ts: 1, intensity: 0.5 },
      { topic: 'values', ts: 0, intensity: 0.05 },
    ]);
    const e = escalatingDtmTopics(rows);
    expect(e).toContain('conflict');
    expect(e).toContain('finance');
    expect(e).not.toContain('values');
  });

  it('all 16 topics processed', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, ts: 0, intensity: 0.5 });
    for (const r of summarizeDtmTopicTensionEscalation(evs)) expect(r.events).toBe(1);
  });

  it('mean/max consistent', () => {
    const r = summarizeDtmTopicTensionEscalation([
      { topic: 'faith', ts: 0, intensity: 0.2 },
      { topic: 'faith', ts: 1, intensity: 0.8 },
    ]);
    const f = r.find((x) => x.topic === 'faith')!;
    expect(f.meanIntensity).toBeCloseTo(0.5, 6);
    expect(f.maxIntensity).toBe(0.8);
  });
});
