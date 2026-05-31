import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicGratitudeRatio,
  starvedGratitudeDtmTopics,
} from '../dtmTopicGratitudeRatio';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicGratitudeRatio', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicGratitudeRatio([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicGratitudeRatio([])) expect(r.band).toBe('untested');
  });

  it('all gratitude => lavish', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'family', signal: 'gratitude' },
      { topic: 'family', signal: 'appreciation' },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.ratio).toBe(1);
    expect(f.band).toBe('lavish');
  });

  it('all complaint => starved', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'conflict', signal: 'complaint' },
      { topic: 'conflict', signal: 'criticism' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('starved');
  });

  it('only silence => starved (denom=0)', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'communication', signal: 'silence' },
      { topic: 'communication', signal: 'silence' },
    ]);
    const c = r.find((x) => x.topic === 'communication')!;
    expect(c.events).toBe(2);
    expect(c.ratio).toBe(0);
    expect(c.band).toBe('starved');
  });

  it('half-and-half => lean', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'finance', signal: 'gratitude' },
      { topic: 'finance', signal: 'complaint' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('lean');
  });

  it('compliment counts as positive', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'leisure', signal: 'compliment' },
      { topic: 'leisure', signal: 'compliment' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('lavish');
  });

  it('criticism counts as negative', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'growth', signal: 'gratitude' },
      { topic: 'growth', signal: 'criticism' },
      { topic: 'growth', signal: 'criticism' },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    // 1 / (1+2) = 0.333 -> starved
    expect(g.band).toBe('starved');
  });

  it('boundary 0.6 => nourished', () => {
    // 3 positive, 2 negative => 0.6
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'intimacy', signal: 'gratitude' },
      { topic: 'intimacy', signal: 'gratitude' },
      { topic: 'intimacy', signal: 'gratitude' },
      { topic: 'intimacy', signal: 'complaint' },
      { topic: 'intimacy', signal: 'complaint' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('nourished');
  });

  it('boundary 0.85 => lavish', () => {
    // 17 positive, 3 negative = 0.85
    const evs: any[] = [];
    for (let i = 0; i < 17; i++) evs.push({ topic: 'social', signal: 'gratitude' });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'social', signal: 'complaint' });
    expect(summarizeDtmTopicGratitudeRatio(evs).find((x) => x.topic === 'social')!.band).toBe(
      'lavish'
    );
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicGratitudeRatio([{ topic: 'nope', signal: 'gratitude' }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'values', signal: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('counts breakdown matches input', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'health', signal: 'gratitude' },
      { topic: 'health', signal: 'complaint' },
      { topic: 'health', signal: 'silence' },
    ]);
    const h = r.find((x) => x.topic === 'health')!;
    expect(h.positive).toBe(1);
    expect(h.negative).toBe(1);
    expect(h.silence).toBe(1);
  });

  it('all 16 topics handled', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'gratitude' });
    for (const r of summarizeDtmTopicGratitudeRatio(evs)) expect(r.band).toBe('lavish');
  });

  it('starvedGratitudeDtmTopics filters', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'autonomy', signal: 'complaint' },
      { topic: 'faith', signal: 'gratitude' },
    ]);
    const s = starvedGratitudeDtmTopics(r);
    expect(s).toContain('autonomy');
    expect(s).not.toContain('faith');
  });

  it('silence does not penalize ratio numerator', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'ambition', signal: 'gratitude' },
      { topic: 'ambition', signal: 'silence' },
      { topic: 'ambition', signal: 'silence' },
    ]);
    expect(r.find((x) => x.topic === 'ambition')!.band).toBe('lavish');
  });

  it('events counts silence too', () => {
    const r = summarizeDtmTopicGratitudeRatio([
      { topic: 'parenting', signal: 'silence' },
      { topic: 'parenting', signal: 'silence' },
      { topic: 'parenting', signal: 'gratitude' },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.events).toBe(3);
  });
});
