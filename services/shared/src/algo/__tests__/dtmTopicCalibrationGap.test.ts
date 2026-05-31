import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCalibration,
  miscalibratedDtmTopics,
} from '../dtmTopicCalibrationGap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicCalibrationGap', () => {
  it('canonical row order', () => {
    const r = summarizeDtmTopicCalibration([]);
    expect(r.map((x) => x.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => all untested', () => {
    const r = summarizeDtmTopicCalibration([]);
    for (const row of r) {
      expect(row.band).toBe('untested');
      expect(row.samples).toBe(0);
      expect(row.gap).toBe(0);
      expect(row.brier).toBe(0);
    }
  });

  it('throws on bad tolerance', () => {
    expect(() => summarizeDtmTopicCalibration([], { tolerance: -0.1 })).toThrow();
    expect(() => summarizeDtmTopicCalibration([], { tolerance: 1.5 })).toThrow();
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'nope', predicted: 0.5, observed: 1 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.samples).toBe(0);
  });

  it('skips invalid predicted/observed', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'values', predicted: 1.5, observed: 1 },
      { topic: 'values', predicted: 0.5, observed: 2 as any },
      { topic: 'values', predicted: NaN, observed: 1 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.samples).toBe(0);
  });

  it('perfect calibration => calibrated band, gap=0', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'family', predicted: 1, observed: 1 },
      { topic: 'family', predicted: 0, observed: 0 },
      { topic: 'family', predicted: 0.5, observed: 1 },
      { topic: 'family', predicted: 0.5, observed: 0 },
    ]).find((x) => x.topic === 'family')!;
    expect(r.gap).toBeCloseTo(0);
    expect(r.band).toBe('calibrated');
  });

  it('underconfident when observed > predicted by > tol', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'growth', predicted: 0.2, observed: 1 },
      { topic: 'growth', predicted: 0.3, observed: 1 },
      { topic: 'growth', predicted: 0.2, observed: 1 },
    ]).find((x) => x.topic === 'growth')!;
    expect(r.gap).toBeGreaterThan(0.1);
    expect(r.band).toBe('underconfident');
  });

  it('overconfident when predicted > observed by > tol', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'intimacy', predicted: 0.9, observed: 0 },
      { topic: 'intimacy', predicted: 0.8, observed: 0 },
      { topic: 'intimacy', predicted: 0.9, observed: 1 },
    ]).find((x) => x.topic === 'intimacy')!;
    expect(r.gap).toBeLessThan(-0.1);
    expect(r.band).toBe('overconfident');
  });

  it('brier score for perfect prediction is 0', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'health', predicted: 1, observed: 1 },
      { topic: 'health', predicted: 0, observed: 0 },
    ]).find((x) => x.topic === 'health')!;
    expect(r.brier).toBe(0);
  });

  it('brier score for worst prediction is 1', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'finance', predicted: 0, observed: 1 },
      { topic: 'finance', predicted: 1, observed: 0 },
    ]).find((x) => x.topic === 'finance')!;
    expect(r.brier).toBeCloseTo(1);
  });

  it('brier score for predicted=0.5 is 0.25 each sample', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'leisure', predicted: 0.5, observed: 1 },
      { topic: 'leisure', predicted: 0.5, observed: 0 },
    ]).find((x) => x.topic === 'leisure')!;
    expect(r.brier).toBeCloseTo(0.25);
  });

  it('respects custom tolerance', () => {
    const r = summarizeDtmTopicCalibration(
      [
        { topic: 'social', predicted: 0.4, observed: 1 },
        { topic: 'social', predicted: 0.4, observed: 1 },
      ],
      { tolerance: 0.7 }
    ).find((x) => x.topic === 'social')!;
    expect(r.band).toBe('calibrated');
  });

  it('miscalibratedDtmTopics returns over+underconfident only', () => {
    const rows = summarizeDtmTopicCalibration([
      { topic: 'growth', predicted: 0.2, observed: 1 },
      { topic: 'growth', predicted: 0.2, observed: 1 },
      { topic: 'intimacy', predicted: 0.9, observed: 0 },
      { topic: 'intimacy', predicted: 0.9, observed: 0 },
    ]);
    const m = miscalibratedDtmTopics(rows);
    expect(m).toContain('growth');
    expect(m).toContain('intimacy');
    expect(m).not.toContain('values');
  });

  it('meanPredicted/meanObserved correctness', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'faith', predicted: 0.2, observed: 0 },
      { topic: 'faith', predicted: 0.8, observed: 1 },
    ]).find((x) => x.topic === 'faith')!;
    expect(r.meanPredicted).toBeCloseTo(0.5);
    expect(r.meanObserved).toBeCloseTo(0.5);
    expect(r.gap).toBeCloseTo(0);
    expect(r.band).toBe('calibrated');
  });

  it('all topics not present remain untested', () => {
    const r = summarizeDtmTopicCalibration([
      { topic: 'finance', predicted: 0.5, observed: 1 },
    ]);
    const others = r.filter((x) => x.topic !== 'finance');
    for (const o of others) expect(o.band).toBe('untested');
  });

  it('|gap| exactly at tolerance counts as calibrated', () => {
    const r = summarizeDtmTopicCalibration(
      [{ topic: 'autonomy', predicted: 0.4, observed: 0 }],
      { tolerance: 0.4 }
    ).find((x) => x.topic === 'autonomy')!;
    expect(Math.abs(r.gap)).toBeCloseTo(0.4);
    expect(r.band).toBe('calibrated');
  });
});
