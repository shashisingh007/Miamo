import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicBoundaryClarity,
  foggyBoundaryDtmTopics,
} from '../dtmTopicBoundaryClarity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicBoundaryClarity', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicBoundaryClarity([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicBoundaryClarity([])) expect(r.band).toBe('untested');
  });

  it('all explicit-yes => crystalline', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'intimacy', signal: 'explicit-yes' },
      { topic: 'intimacy', signal: 'explicit-yes' },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(i.clarityScore).toBe(1);
    expect(i.band).toBe('crystalline');
  });

  it('all explicit-no also crystalline (clarity is direction-agnostic)', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'finance', signal: 'explicit-no' },
      { topic: 'finance', signal: 'explicit-no' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('crystalline');
  });

  it('all reversed => foggy', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'autonomy', signal: 'reversed' },
      { topic: 'autonomy', signal: 'reversed' },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.clarityScore).toBe(0);
    expect(a.band).toBe('foggy');
  });

  it('avoidant drags below clear', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'communication', signal: 'avoidant' },
      { topic: 'communication', signal: 'avoidant' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('foggy');
  });

  it('qualified-yes => mixed', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'growth', signal: 'qualified-yes' },
      { topic: 'growth', signal: 'qualified-yes' },
    ]);
    // weighted=0.4 -> (0.4+1)/2=0.7 -> clear (boundary)
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('clear');
  });

  it('counts by category', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'family', signal: 'explicit-yes' },
      { topic: 'family', signal: 'qualified-no' },
      { topic: 'family', signal: 'avoidant' },
      { topic: 'family', signal: 'reversed' },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.explicit).toBe(1);
    expect(f.qualified).toBe(1);
    expect(f.avoidant).toBe(1);
    expect(f.reversed).toBe(1);
    expect(f.events).toBe(4);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicBoundaryClarity([{ topic: 'nope', signal: 'explicit-yes' }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'values', signal: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('single explicit => crystalline', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'leisure', signal: 'explicit-yes' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('crystalline');
  });

  it('single reversed => foggy', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'social', signal: 'reversed' },
    ]);
    expect(r.find((x) => x.topic === 'social')!.band).toBe('foggy');
  });

  it('clarityScore stays within [0,1]', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'health', signal: 'reversed' },
      { topic: 'health', signal: 'reversed' },
      { topic: 'health', signal: 'explicit-yes' },
    ]);
    const h = r.find((x) => x.topic === 'health')!;
    expect(h.clarityScore).toBeGreaterThanOrEqual(0);
    expect(h.clarityScore).toBeLessThanOrEqual(1);
  });

  it('mixed avoidant + explicit yields mixed band', () => {
    // 1 explicit (+1) + 1 avoidant (-0.6) = 0.4 ; mean=0.2 ; (0.2+1)/2=0.6 -> mixed
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'ambition', signal: 'explicit-yes' },
      { topic: 'ambition', signal: 'avoidant' },
    ]);
    expect(r.find((x) => x.topic === 'ambition')!.band).toBe('mixed');
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'explicit-yes' });
    for (const r of summarizeDtmTopicBoundaryClarity(evs)) expect(r.band).toBe('crystalline');
  });

  it('foggyBoundaryDtmTopics filters', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'parenting', signal: 'reversed' },
      { topic: 'faith', signal: 'explicit-yes' },
    ]);
    const f = foggyBoundaryDtmTopics(r);
    expect(f).toContain('parenting');
    expect(f).not.toContain('faith');
  });

  it('qualified-no degrades clarity similar to qualified-yes', () => {
    const r = summarizeDtmTopicBoundaryClarity([
      { topic: 'future', signal: 'qualified-no' },
      { topic: 'future', signal: 'qualified-no' },
    ]);
    // both 0.4 -> 0.7 boundary -> clear
    expect(r.find((x) => x.topic === 'future')!.band).toBe('clear');
  });
});
