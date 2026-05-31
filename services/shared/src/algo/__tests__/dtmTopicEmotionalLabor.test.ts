import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEmotionalLabor,
  overloadedEmotionalLaborDtmTopics,
} from '../dtmTopicEmotionalLabor';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicEmotionalLabor', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicEmotionalLabor([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicEmotionalLabor([])) expect(r.band).toBe('untested');
  });

  it('all self => self-overloaded', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'family', by: 'self', kind: 'planning' },
      { topic: 'family', by: 'self', kind: 'tracking' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('self-overloaded');
  });

  it('all partner => partner-overloaded', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'finance', by: 'partner', kind: 'planning' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('partner-overloaded');
  });

  it('50/50 => balanced', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'social', by: 'self', kind: 'mediating' },
      { topic: 'social', by: 'partner', kind: 'mediating' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.band).toBe('balanced');
    expect(s.balanceScore).toBeCloseTo(1, 6);
  });

  it('70/30 => self-leaning', () => {
    const evs: any[] = [];
    for (let i = 0; i < 7; i++) evs.push({ topic: 'health', by: 'self', kind: 'tracking' });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'health', by: 'partner', kind: 'tracking' });
    expect(summarizeDtmTopicEmotionalLabor(evs).find((x) => x.topic === 'health')!.band).toBe(
      'self-leaning'
    );
  });

  it('20/80 => partner-leaning', () => {
    const evs: any[] = [];
    for (let i = 0; i < 2; i++) evs.push({ topic: 'leisure', by: 'self', kind: 'planning' });
    for (let i = 0; i < 8; i++) evs.push({ topic: 'leisure', by: 'partner', kind: 'planning' });
    expect(summarizeDtmTopicEmotionalLabor(evs).find((x) => x.topic === 'leisure')!.band).toBe(
      'partner-leaning'
    );
  });

  it('weight respected', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'parenting', by: 'self', kind: 'planning', weight: 5 },
      { topic: 'parenting', by: 'partner', kind: 'planning', weight: 5 },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.totalWeight).toBe(10);
    expect(r.find((x) => x.topic === 'parenting')!.balanceScore).toBeCloseTo(1, 6);
  });

  it('ignores negative weight', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'values', by: 'self', kind: 'planning', weight: -1 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores invalid by', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'values', by: 'nope' as any, kind: 'planning' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.totalWeight).toBe(0);
  });

  it('ignores invalid kind', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'values', by: 'self', kind: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.totalWeight).toBe(0);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'nope', by: 'self', kind: 'planning' },
    ]);
    for (const row of r) expect(row.totalWeight).toBe(0);
  });

  it('default weight is 1', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'growth', by: 'self', kind: 'planning' },
    ]);
    expect(r.find((x) => x.topic === 'growth')!.totalWeight).toBe(1);
  });

  it('selfShare bounds', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'autonomy', by: 'self', kind: 'planning' },
      { topic: 'autonomy', by: 'partner', kind: 'planning' },
    ]);
    expect(r.find((x) => x.topic === 'autonomy')!.selfShare).toBeCloseTo(0.5, 6);
  });

  it('balanceScore in [0,1]', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'faith', by: 'self', kind: 'planning' },
    ]);
    const s = r.find((x) => x.topic === 'faith')!;
    expect(s.balanceScore).toBeGreaterThanOrEqual(0);
    expect(s.balanceScore).toBeLessThanOrEqual(1);
  });

  it('overloadedEmotionalLaborDtmTopics filter', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'finance', by: 'self', kind: 'planning' },
      { topic: 'social', by: 'self', kind: 'planning' },
      { topic: 'social', by: 'partner', kind: 'planning' },
    ]);
    const o = overloadedEmotionalLaborDtmTopics(r);
    expect(o).toContain('finance');
    expect(o).not.toContain('social');
  });

  it('all 16 topics independent', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) {
      evs.push({ topic: t, by: 'self', kind: 'planning' });
      evs.push({ topic: t, by: 'partner', kind: 'planning' });
    }
    for (const r of summarizeDtmTopicEmotionalLabor(evs)) expect(r.band).toBe('balanced');
  });

  it('weight=0 ignored', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'values', by: 'self', kind: 'planning', weight: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.totalWeight).toBe(0);
  });

  it('NaN weight ignored', () => {
    const r = summarizeDtmTopicEmotionalLabor([
      { topic: 'values', by: 'self', kind: 'planning', weight: NaN },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });
});
