import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSentiment,
  overallDtmSentiment,
} from '../dtmTopicSentimentMap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicSentimentMap', () => {
  it('one row per topic in order', () => {
    const r = summarizeDtmTopicSentiment(new Map());
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('empty -> neutral 0', () => {
    const r = summarizeDtmTopicSentiment(new Map());
    expect(r.every((x) => x.sentiment === 0 && x.band === 'neutral')).toBe(true);
  });

  it('all positive answers -> positive band', () => {
    const r = summarizeDtmTopicSentiment(new Map([['values', [0.8, 0.7, 0.9]]]));
    const row = r.find((x) => x.topic === 'values')!;
    expect(row.sentiment).toBeCloseTo(0.8, 5);
    expect(row.band).toBe('positive');
  });

  it('all negative answers -> negative band', () => {
    const r = summarizeDtmTopicSentiment(new Map([['family', [-0.5, -0.6, -0.7]]]));
    expect(r.find((x) => x.topic === 'family')!.band).toBe('negative');
  });

  it('mixed averaging to ~0 -> neutral', () => {
    const r = summarizeDtmTopicSentiment(new Map([['faith', [-0.4, 0.4]]]));
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('neutral');
  });

  it('clamps out-of-range values', () => {
    const r = summarizeDtmTopicSentiment(new Map([['ambition', [5, 5, 5]]]));
    expect(r.find((x) => x.topic === 'ambition')!.sentiment).toBe(1);
  });

  it('ignores NaN/Infinity', () => {
    const r = summarizeDtmTopicSentiment(new Map([['social', [NaN, Infinity, 0.5]]]));
    expect(r.find((x) => x.topic === 'social')!.sentiment).toBe(0.5);
  });

  it('boundary at 0.1 -> neutral (strict)', () => {
    const r = summarizeDtmTopicSentiment(new Map([['health', [0.1]]]));
    expect(r.find((x) => x.topic === 'health')!.band).toBe('neutral');
  });

  it('overallDtmSentiment averages all rows', () => {
    const r = summarizeDtmTopicSentiment(
      new Map([
        ['values', [1, 1, 1]],
        ['family', [-1, -1, -1]],
      ]),
    );
    expect(overallDtmSentiment(r)).toBe(0);
  });

  it('overallDtmSentiment empty -> 0', () => {
    expect(overallDtmSentiment([])).toBe(0);
  });
});
