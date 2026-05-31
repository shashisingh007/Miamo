import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSaliency,
  topDtmSaliencyTopics,
} from '../dtmTopicSaliencyMap';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicSaliencyMap', () => {
  it('one row per topic in order', () => {
    const r = summarizeDtmTopicSaliency({ weight: new Map(), partnerWeight: new Map() });
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('empty -> all low + 0', () => {
    const r = summarizeDtmTopicSaliency({ weight: new Map(), partnerWeight: new Map() });
    expect(r.every((x) => x.saliency === 0 && x.band === 'low')).toBe(true);
  });

  it('takes max of self vs partner', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['values', 0.3]]),
      partnerWeight: new Map([['values', 0.8]]),
    });
    expect(r.find((x) => x.topic === 'values')!.saliency).toBe(0.8);
  });

  it('band high at >= 0.66', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['family', 0.9]]),
      partnerWeight: new Map(),
    });
    expect(r.find((x) => x.topic === 'family')!.band).toBe('high');
  });

  it('band medium between 0.33 and 0.66', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['faith', 0.5]]),
      partnerWeight: new Map(),
    });
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('medium');
  });

  it('band low when below 0.33', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['health', 0.2]]),
      partnerWeight: new Map(),
    });
    expect(r.find((x) => x.topic === 'health')!.band).toBe('low');
  });

  it('clamps to [0,1]', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['ambition', 5], ['social', -1]]),
      partnerWeight: new Map(),
    });
    expect(r.find((x) => x.topic === 'ambition')!.saliency).toBe(1);
    expect(r.find((x) => x.topic === 'social')!.saliency).toBe(0);
  });

  it('ignores NaN', () => {
    const r = summarizeDtmTopicSaliency({
      weight: new Map([['leisure', NaN]]) as any,
      partnerWeight: new Map(),
    });
    expect(r.find((x) => x.topic === 'leisure')!.saliency).toBe(0);
  });

  it('topDtmSaliencyTopics returns top-k desc', () => {
    const rows = summarizeDtmTopicSaliency({
      weight: new Map([
        ['values', 0.9],
        ['family', 0.5],
        ['faith', 0.1],
      ]),
      partnerWeight: new Map(),
    });
    const top = topDtmSaliencyTopics(rows, 2);
    expect(top.map((r) => r.topic)).toEqual(['values', 'family']);
  });

  it('topDtmSaliencyTopics k<=0 -> []', () => {
    const rows = summarizeDtmTopicSaliency({
      weight: new Map([['values', 0.5]]),
      partnerWeight: new Map(),
    });
    expect(topDtmSaliencyTopics(rows, 0)).toEqual([]);
  });

  it('ties broken by topic key', () => {
    const rows = summarizeDtmTopicSaliency({
      weight: new Map([['ambition', 0.9], ['values', 0.9]]),
      partnerWeight: new Map(),
    });
    expect(topDtmSaliencyTopics(rows, 2).map((r) => r.topic)).toEqual(['ambition', 'values']);
  });
});
