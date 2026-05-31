import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHeat, hottestDtmTopics } from '../dtmTopicHeatMap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('dtmTopicHeatMap', () => {
  it('one row per topic in order', () => {
    const r = summarizeDtmTopicHeat(new Map(), NOW);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('untouched -> heat 0 cold', () => {
    const r = summarizeDtmTopicHeat(new Map(), NOW);
    expect(r.every((x) => x.heat === 0 && x.band === 'cold')).toBe(true);
  });

  it('just touched -> heat 1 hot', () => {
    const r = summarizeDtmTopicHeat(new Map([['values', NOW]]), NOW);
    const row = r.find((x) => x.topic === 'values')!;
    expect(row.heat).toBeCloseTo(1, 5);
    expect(row.band).toBe('hot');
  });

  it('one half-life -> heat ~0.5 warm', () => {
    const r = summarizeDtmTopicHeat(new Map([['family', NOW - 7 * DAY]]), NOW);
    const row = r.find((x) => x.topic === 'family')!;
    expect(row.heat).toBeCloseTo(0.5, 5);
    expect(row.band).toBe('warm');
  });

  it('two half-lives -> heat ~0.25 (boundary -> warm via strict <)', () => {
    const r = summarizeDtmTopicHeat(new Map([['faith', NOW - 14 * DAY]]), NOW);
    const row = r.find((x) => x.topic === 'faith')!;
    expect(row.heat).toBeCloseTo(0.25, 5);
    expect(row.band).toBe('warm');
  });

  it('three half-lives -> cold band', () => {
    const r = summarizeDtmTopicHeat(new Map([['faith', NOW - 21 * DAY]]), NOW);
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('cold');
  });

  it('future timestamp clamped to heat=1', () => {
    const r = summarizeDtmTopicHeat(new Map([['health', NOW + DAY]]), NOW);
    expect(r.find((x) => x.topic === 'health')!.heat).toBe(1);
  });

  it('invalid timestamps treated as 0', () => {
    const m = new Map<any, number>([['ambition', NaN], ['social', -100]]) as any;
    const r = summarizeDtmTopicHeat(m, NOW);
    expect(r.find((x) => x.topic === 'ambition')!.heat).toBe(0);
    expect(r.find((x) => x.topic === 'social')!.heat).toBe(0);
  });

  it('hottestDtmTopics returns top-k by heat', () => {
    const rows = summarizeDtmTopicHeat(
      new Map([
        ['values', NOW - DAY],
        ['family', NOW - 7 * DAY],
        ['faith', NOW - 30 * DAY],
      ]),
      NOW,
    );
    const top = hottestDtmTopics(rows, 2);
    expect(top.map((r) => r.topic)).toEqual(['values', 'family']);
  });

  it('hottestDtmTopics filters zero-heat', () => {
    const rows = summarizeDtmTopicHeat(new Map(), NOW);
    expect(hottestDtmTopics(rows, 5)).toEqual([]);
  });

  it('hottestDtmTopics k<=0 -> empty', () => {
    const rows = summarizeDtmTopicHeat(new Map([['values', NOW]]), NOW);
    expect(hottestDtmTopics(rows, 0)).toEqual([]);
    expect(hottestDtmTopics(rows, -1)).toEqual([]);
  });

  it('ties broken by topic key', () => {
    const rows = summarizeDtmTopicHeat(
      new Map([['family', NOW], ['ambition', NOW]]),
      NOW,
    );
    const top = hottestDtmTopics(rows, 2);
    expect(top.map((r) => r.topic)).toEqual(['ambition', 'family']);
  });
});
