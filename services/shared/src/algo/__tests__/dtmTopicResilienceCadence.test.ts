import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicResilienceCadence, collapsedDtmTopics } from '../dtmTopicResilienceCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicResilienceCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicResilienceCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicResilienceCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('bouncing => recovering', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'bouncing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('recovering');
  });

  it('recovering => steady', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'recovering' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steady');
  });

  it('steady => steady', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steady');
  });

  it('depleted => collapsed', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'depleted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('collapsed');
  });

  it('collapsed => collapsed', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'collapsed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('collapsed');
  });

  it('mixed 0.5 => depleted', () => {
    const r = summarizeDtmTopicResilienceCadence([
      { topic: 'values', signal: 'bouncing' },
      { topic: 'values', signal: 'collapsed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'x', signal: 'bouncing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicResilienceCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicResilienceCadence([
      { topic: 'values', signal: 'bouncing' },
      { topic: 'values', signal: 'depleted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('collapsedDtmTopics filters', () => {
    const r = summarizeDtmTopicResilienceCadence([
      { topic: 'values', signal: 'collapsed' },
      { topic: 'family', signal: 'depleted' },
      { topic: 'finance', signal: 'bouncing' },
    ]);
    expect(collapsedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicResilienceCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicResilienceCadence([
      { topic: 'values', signal: 'bouncing' },
      { topic: 'family', signal: 'collapsed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
