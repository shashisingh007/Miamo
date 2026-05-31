import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSelfDisclosure,
  intimateDisclosureDtmTopics,
} from '../dtmTopicSelfDisclosureDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicSelfDisclosureDepth', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicSelfDisclosure([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicSelfDisclosure([])) expect(r.band).toBe('untested');
  });

  it('all core => intimate', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'values', depth: 'core' },
      { topic: 'values', depth: 'core' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('intimate');
  });

  it('all surface => guarded', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'leisure', depth: 'surface' },
      { topic: 'leisure', depth: 'surface' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('guarded');
  });

  it('all belief => open', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'faith', depth: 'belief' },
      { topic: 'faith', depth: 'belief' },
    ]);
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('open');
  });

  it('all preference => casual', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'lifestyle', depth: 'preference' },
      { topic: 'lifestyle', depth: 'preference' },
    ]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('casual');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'social', depth: 'surface' },
      { topic: 'social', depth: 'preference' },
      { topic: 'social', depth: 'belief' },
      { topic: 'social', depth: 'core' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(4);
    expect(s.surface).toBe(1);
    expect(s.preference).toBe(1);
    expect(s.belief).toBe(1);
    expect(s.core).toBe(1);
  });

  it('depthScore in [0,1]', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'communication', depth: 'core' },
    ]);
    const c = r.find((x) => x.topic === 'communication')!;
    expect(c.depthScore).toBe(1);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicSelfDisclosure([{ topic: 'nope', depth: 'core' }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('ignores invalid depth', () => {
    const r = summarizeDtmTopicSelfDisclosure([{ topic: 'values', depth: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('intimateDisclosureDtmTopics filter', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'intimacy', depth: 'core' },
      { topic: 'intimacy', depth: 'core' },
      { topic: 'finance', depth: 'surface' },
    ]);
    const filt = intimateDisclosureDtmTopics(r);
    expect(filt).toContain('intimacy');
    expect(filt).not.toContain('finance');
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, depth: 'core' });
    for (const r of summarizeDtmTopicSelfDisclosure(evs)) expect(r.band).toBe('intimate');
  });

  it('mixed surface/core averages', () => {
    const r = summarizeDtmTopicSelfDisclosure([
      { topic: 'health', depth: 'surface' },
      { topic: 'health', depth: 'core' },
    ]);
    // avg = 0.5 => open
    expect(r.find((x) => x.topic === 'health')!.band).toBe('open');
  });

  it('single belief => open', () => {
    const r = summarizeDtmTopicSelfDisclosure([{ topic: 'growth', depth: 'belief' }]);
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('open');
  });

  it('single preference => casual', () => {
    const r = summarizeDtmTopicSelfDisclosure([{ topic: 'autonomy', depth: 'preference' }]);
    expect(r.find((x) => x.topic === 'autonomy')!.band).toBe('casual');
  });

  it('untested has zero depthScore', () => {
    const r = summarizeDtmTopicSelfDisclosure([]);
    expect(r[0].depthScore).toBe(0);
  });
});
