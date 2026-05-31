import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHumorMoments,
  playfulHumorDtmTopics,
} from '../dtmTopicHumorMoments';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicHumorMoments', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicHumorMoments([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicHumorMoments([])) expect(r.band).toBe('untested');
  });

  it('all shared-laugh => playful', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'leisure', signal: 'shared-laugh' },
      { topic: 'leisure', signal: 'shared-laugh' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('playful');
  });

  it('all sarcasm => dry', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'conflict', signal: 'sarcasm' },
      { topic: 'conflict', signal: 'sarcasm' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('dry');
  });

  it('all flat => dry', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'finance', signal: 'flat' },
      { topic: 'finance', signal: 'flat' },
    ]);
    const f = r.find((x) => x.topic === 'finance')!;
    expect(f.band).toBe('dry');
    expect(f.warmthScore).toBeCloseTo(0.2, 5);
  });

  it('callback-joke => warm', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'family', signal: 'callback-joke' },
      { topic: 'family', signal: 'callback-joke' },
    ]);
    // 0.8 -> (0.8+1)/2 = 0.9 -> playful
    expect(r.find((x) => x.topic === 'family')!.band).toBe('playful');
  });

  it('tease => wry', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'growth', signal: 'tease' },
      { topic: 'growth', signal: 'tease' },
    ]);
    // 0.2 -> (0.2+1)/2 = 0.6 -> wry
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('wry');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'social', signal: 'shared-laugh' },
      { topic: 'social', signal: 'callback-joke' },
      { topic: 'social', signal: 'tease' },
      { topic: 'social', signal: 'sarcasm' },
      { topic: 'social', signal: 'flat' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(5);
    expect(s.shared + s.callbacks + s.teases + s.sarcasm + s.flat).toBe(5);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicHumorMoments([{ topic: 'nope', signal: 'shared-laugh' }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicHumorMoments([{ topic: 'values', signal: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('mixed laughs and sarcasm => mid-range', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'intimacy', signal: 'shared-laugh' },
      { topic: 'intimacy', signal: 'sarcasm' },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    // (1.0 - 0.4)/2 = 0.3 mean -> (0.3+1)/2 = 0.65 -> warm (boundary)
    expect(i.band).toBe('warm');
  });

  it('warmthScore in [0,1]', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'health', signal: 'flat' },
      { topic: 'health', signal: 'flat' },
      { topic: 'health', signal: 'shared-laugh' },
    ]);
    const h = r.find((x) => x.topic === 'health')!;
    expect(h.warmthScore).toBeGreaterThanOrEqual(0);
    expect(h.warmthScore).toBeLessThanOrEqual(1);
  });

  it('all 16 topics handled', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'shared-laugh' });
    for (const r of summarizeDtmTopicHumorMoments(evs)) expect(r.band).toBe('playful');
  });

  it('playfulHumorDtmTopics filters', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'leisure', signal: 'shared-laugh' },
      { topic: 'conflict', signal: 'sarcasm' },
    ]);
    const p = playfulHumorDtmTopics(r);
    expect(p).toContain('leisure');
    expect(p).not.toContain('conflict');
  });

  it('single tease => wry', () => {
    const r = summarizeDtmTopicHumorMoments([{ topic: 'autonomy', signal: 'tease' }]);
    expect(r.find((x) => x.topic === 'autonomy')!.band).toBe('wry');
  });

  it('flat between laughs', () => {
    const r = summarizeDtmTopicHumorMoments([
      { topic: 'parenting', signal: 'shared-laugh' },
      { topic: 'parenting', signal: 'shared-laugh' },
      { topic: 'parenting', signal: 'flat' },
    ]);
    // (1+1-0.6)/3 = 0.4666 -> (0.4666+1)/2 = 0.733 -> warm
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('warm');
  });

  it('handles long event lists', () => {
    const evs: any[] = [];
    for (let i = 0; i < 200; i++)
      evs.push({ topic: 'communication', signal: i % 2 ? 'shared-laugh' : 'tease' });
    const r = summarizeDtmTopicHumorMoments(evs);
    expect(r.find((x) => x.topic === 'communication')!.events).toBe(200);
  });

  it('readonly events accepted', () => {
    const evs: ReadonlyArray<any> = Object.freeze([
      { topic: 'faith', signal: 'shared-laugh' },
    ]);
    expect(summarizeDtmTopicHumorMoments(evs).find((x) => x.topic === 'faith')!.events).toBe(1);
  });
});
