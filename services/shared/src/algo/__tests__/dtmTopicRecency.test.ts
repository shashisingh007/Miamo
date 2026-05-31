import { describe, it, expect } from 'vitest';
import { computeDtmTopicRecency } from '../dtmTopicRecency';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('dtmTopicRecency', () => {
  it('never-answered topics weight 1 (most stale)', () => {
    const out = computeDtmTopicRecency({}, { nowMs: NOW });
    expect(out).toHaveLength(DTM_TOPIC_KEYS.length);
    expect(out.every((r) => r.weight === 1)).toBe(true);
  });

  it('within freshDays -> weight 0', () => {
    const out = computeDtmTopicRecency({ values: NOW - 1 * DAY }, { nowMs: NOW, freshDays: 3 });
    const v = out.find((r) => r.topicKey === 'values')!;
    expect(v.weight).toBe(0);
  });

  it('beyond staleDays -> weight 1', () => {
    const out = computeDtmTopicRecency({ values: NOW - 99 * DAY }, { nowMs: NOW, staleDays: 30 });
    expect(out.find((r) => r.topicKey === 'values')!.weight).toBe(1);
  });

  it('linear ramp in between', () => {
    const out = computeDtmTopicRecency({ values: NOW - 15 * DAY }, { nowMs: NOW, freshDays: 0, staleDays: 30 });
    expect(out.find((r) => r.topicKey === 'values')!.weight).toBeCloseTo(0.5, 6);
  });

  it('sorted by weight desc (stalest first)', () => {
    const out = computeDtmTopicRecency(
      { values: NOW - 1 * DAY, family: NOW - 50 * DAY },
      { nowMs: NOW, freshDays: 3, staleDays: 30 },
    );
    const idxFamily = out.findIndex((r) => r.topicKey === 'family');
    const idxValues = out.findIndex((r) => r.topicKey === 'values');
    expect(idxFamily).toBeLessThan(idxValues);
  });

  it('handles future-dated timestamps as 0 days (fresh)', () => {
    const out = computeDtmTopicRecency({ values: NOW + 99 * DAY }, { nowMs: NOW });
    expect(out.find((r) => r.topicKey === 'values')!.weight).toBe(0);
  });

  it('drops non-finite timestamps silently', () => {
    const out = computeDtmTopicRecency({ values: NaN, family: Infinity }, { nowMs: NOW });
    expect(out.find((r) => r.topicKey === 'values')).toBeUndefined();
    expect(out.find((r) => r.topicKey === 'family')).toBeUndefined();
  });

  it('clamps stale<=fresh by tiny epsilon (no divide-by-zero)', () => {
    const out = computeDtmTopicRecency({ values: NOW - 5 * DAY }, { nowMs: NOW, freshDays: 10, staleDays: 5 });
    const v = out.find((r) => r.topicKey === 'values')!;
    expect(Number.isFinite(v.weight)).toBe(true);
  });

  it('daysSince correctly computed', () => {
    const out = computeDtmTopicRecency({ values: NOW - 7 * DAY }, { nowMs: NOW });
    expect(out.find((r) => r.topicKey === 'values')!.daysSince).toBeCloseTo(7, 6);
  });
});
