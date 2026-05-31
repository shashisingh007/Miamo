import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicHorsemen,
  corrosiveHorsemanDtmTopics,
} from '../dtmTopicHorsemenSignals';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicHorsemenSignals', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicHorsemen([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicHorsemen([])) expect(r.band).toBe('untested');
  });

  it('all contempt => corrosive', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'conflict', signal: 'contempt' },
      { topic: 'conflict', signal: 'contempt' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('corrosive');
  });

  it('all repair => healthy', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'family', signal: 'repair' },
      { topic: 'family', signal: 'repair' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('healthy');
  });

  it('soft-startup keeps healthy', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'communication', signal: 'soft-startup' },
      { topic: 'communication', signal: 'soft-startup' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('healthy');
  });

  it('criticism => tense', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'finance', signal: 'criticism' },
      { topic: 'finance', signal: 'criticism' },
    ]);
    // 0.6 -> (0.6+1)/2=0.8 -> hostile
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('hostile');
  });

  it('stonewalling => hostile', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'intimacy', signal: 'stonewalling' },
      { topic: 'intimacy', signal: 'stonewalling' },
    ]);
    // 0.7 -> 0.85 -> corrosive
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('corrosive');
  });

  it('defensiveness mid-range', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'growth', signal: 'defensiveness' },
      { topic: 'growth', signal: 'defensiveness' },
    ]);
    // 0.5 -> 0.75 -> hostile
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('hostile');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'social', signal: 'criticism' },
      { topic: 'social', signal: 'contempt' },
      { topic: 'social', signal: 'defensiveness' },
      { topic: 'social', signal: 'stonewalling' },
      { topic: 'social', signal: 'soft-startup' },
      { topic: 'social', signal: 'repair' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(6);
    expect(s.criticism).toBe(1);
    expect(s.contempt).toBe(1);
    expect(s.defensiveness).toBe(1);
    expect(s.stonewalling).toBe(1);
    expect(s.softStartup).toBe(1);
    expect(s.repair).toBe(1);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicHorsemen([{ topic: 'nope', signal: 'contempt' }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicHorsemen([{ topic: 'values', signal: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('repair cancels criticism partially', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'health', signal: 'criticism' },
      { topic: 'health', signal: 'repair' },
    ]);
    // (0.6-0.7)/2 = -0.05 -> (−0.05+1)/2 = 0.475 -> tense
    expect(r.find((x) => x.topic === 'health')!.band).toBe('tense');
  });

  it('toxicityScore in [0,1]', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'autonomy', signal: 'contempt' },
      { topic: 'autonomy', signal: 'soft-startup' },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.toxicityScore).toBeGreaterThanOrEqual(0);
    expect(a.toxicityScore).toBeLessThanOrEqual(1);
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'contempt' });
    for (const r of summarizeDtmTopicHorsemen(evs)) expect(r.band).toBe('corrosive');
  });

  it('corrosiveHorsemanDtmTopics filter', () => {
    const r = summarizeDtmTopicHorsemen([
      { topic: 'parenting', signal: 'contempt' },
      { topic: 'faith', signal: 'repair' },
    ]);
    const c = corrosiveHorsemanDtmTopics(r);
    expect(c).toContain('parenting');
    expect(c).not.toContain('faith');
  });

  it('single repair => healthy', () => {
    const r = summarizeDtmTopicHorsemen([{ topic: 'leisure', signal: 'repair' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('healthy');
  });
});
