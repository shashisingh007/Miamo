import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicShameAvoidance,
  floodedShameDtmTopics,
} from '../dtmTopicShameAvoidance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicShameAvoidance', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicShameAvoidance([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicShameAvoidance([])) expect(r.band).toBe('untested');
  });

  it('all honest-engage => grounded', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'values', signal: 'honest-engage' },
      { topic: 'values', signal: 'honest-engage' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grounded');
  });

  it('all self-attack => flooded', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'intimacy', signal: 'self-attack' },
      { topic: 'intimacy', signal: 'self-attack' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('flooded');
  });

  it('all retreat => flooded', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'conflict', signal: 'retreat' },
      { topic: 'conflict', signal: 'retreat' },
    ]);
    // 0.7 -> 0.85 -> flooded
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('flooded');
  });

  it('all deflect => avoidant', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'finance', signal: 'deflect' },
      { topic: 'finance', signal: 'deflect' },
    ]);
    // 0.5 -> 0.75 -> avoidant
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('avoidant');
  });

  it('all minimize => avoidant', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'health', signal: 'minimize' },
      { topic: 'health', signal: 'minimize' },
    ]);
    // 0.4 -> 0.7 -> avoidant
    expect(r.find((x) => x.topic === 'health')!.band).toBe('avoidant');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'social', signal: 'honest-engage' },
      { topic: 'social', signal: 'deflect' },
      { topic: 'social', signal: 'minimize' },
      { topic: 'social', signal: 'self-attack' },
      { topic: 'social', signal: 'retreat' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(5);
    expect(s.honestEngage).toBe(1);
    expect(s.deflect).toBe(1);
    expect(s.minimize).toBe(1);
    expect(s.selfAttack).toBe(1);
    expect(s.retreat).toBe(1);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicShameAvoidance([{ topic: 'nope', signal: 'self-attack' }]);
    for (const row of r) expect(row.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicShameAvoidance([{ topic: 'values', signal: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('honest-engage tempers self-attack', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'parenting', signal: 'self-attack' },
      { topic: 'parenting', signal: 'honest-engage' },
    ]);
    // (0.8 + -0.6) / 2 = 0.1 -> (0.1+1)/2 = 0.55 -> cautious
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('cautious');
  });

  it('avoidanceScore in [0,1]', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'autonomy', signal: 'retreat' },
      { topic: 'autonomy', signal: 'honest-engage' },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.avoidanceScore).toBeGreaterThanOrEqual(0);
    expect(a.avoidanceScore).toBeLessThanOrEqual(1);
  });

  it('all 16 topics handled', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'self-attack' });
    for (const r of summarizeDtmTopicShameAvoidance(evs)) expect(r.band).toBe('flooded');
  });

  it('floodedShameDtmTopics filter', () => {
    const r = summarizeDtmTopicShameAvoidance([
      { topic: 'family', signal: 'self-attack' },
      { topic: 'faith', signal: 'honest-engage' },
    ]);
    const filt = floodedShameDtmTopics(r);
    expect(filt).toContain('family');
    expect(filt).not.toContain('faith');
  });

  it('single honest-engage => grounded', () => {
    const r = summarizeDtmTopicShameAvoidance([{ topic: 'leisure', signal: 'honest-engage' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('grounded');
  });
});
