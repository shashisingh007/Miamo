import { describe, it, expect } from 'vitest';
import { detectDtmTopicShifts } from '../dtmTopicShiftDetector';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const T = 1_700_000_000_000;

describe('dtmTopicShiftDetector', () => {
  it('one row per topic in order', () => {
    const r = detectDtmTopicShifts([], T);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('no events -> all flat 0', () => {
    const r = detectDtmTopicShifts([], T);
    expect(r.every((x) => x.delta === 0 && x.direction === 'flat')).toBe(true);
  });

  it('upward shift detected', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'values', tsMs: T - 1000, value: 0.1 },
        { topic: 'values', tsMs: T + 1000, value: 0.9 },
      ],
      T,
    );
    const row = r.find((x) => x.topic === 'values')!;
    expect(row.direction).toBe('up');
    expect(row.significant).toBe(true);
  });

  it('downward shift detected', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'family', tsMs: T - 1, value: 0.8 },
        { topic: 'family', tsMs: T + 1, value: -0.2 },
      ],
      T,
    );
    expect(r.find((x) => x.topic === 'family')!.direction).toBe('down');
  });

  it('flat shift when |delta| <= 0.1', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'faith', tsMs: T - 1, value: 0.5 },
        { topic: 'faith', tsMs: T + 1, value: 0.55 },
      ],
      T,
    );
    const row = r.find((x) => x.topic === 'faith')!;
    expect(row.direction).toBe('flat');
    expect(row.significant).toBe(false);
  });

  it('averages multiple values per side', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'health', tsMs: T - 2, value: 0 },
        { topic: 'health', tsMs: T - 1, value: 0 },
        { topic: 'health', tsMs: T + 1, value: 1 },
        { topic: 'health', tsMs: T + 2, value: 1 },
      ],
      T,
    );
    const row = r.find((x) => x.topic === 'health')!;
    expect(row.before).toBe(0);
    expect(row.after).toBe(1);
  });

  it('events exactly at pivot count as after', () => {
    const r = detectDtmTopicShifts(
      [{ topic: 'social', tsMs: T, value: 0.9 }],
      T,
    );
    expect(r.find((x) => x.topic === 'social')!.after).toBe(0.9);
  });

  it('clamps out-of-range values', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'ambition', tsMs: T - 1, value: -5 },
        { topic: 'ambition', tsMs: T + 1, value: 5 },
      ],
      T,
    );
    expect(r.find((x) => x.topic === 'ambition')!.delta).toBe(2);
  });

  it('ignores invalid topics and tsMs', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'badtopic' as any, tsMs: T - 1, value: 1 },
        { topic: 'leisure', tsMs: NaN, value: 1 },
      ],
      T,
    );
    expect(r.find((x) => x.topic === 'leisure')!.delta).toBe(0);
  });

  it('boundary at delta=0.1 -> flat (strict >)', () => {
    const r = detectDtmTopicShifts(
      [
        { topic: 'parenting', tsMs: T - 1, value: 0 },
        { topic: 'parenting', tsMs: T + 1, value: 0.1 },
      ],
      T,
    );
    expect(r.find((x) => x.topic === 'parenting')!.direction).toBe('flat');
  });
});
