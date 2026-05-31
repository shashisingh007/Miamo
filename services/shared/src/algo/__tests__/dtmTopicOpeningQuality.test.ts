import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicOpeningQuality, closedDtmTopics } from '../dtmTopicOpeningQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicOpeningQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicOpeningQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicOpeningQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('opening-fully => open', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'opening-fully' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('open');
  });

  it('opening => partial', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'opening' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('guarded => closed', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed => closed', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('half-open mean => guarded', () => {
    const r = summarizeDtmTopicOpeningQuality([
      { topic: 'values', signal: 'opening-fully' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'x', signal: 'opening' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicOpeningQuality([{ topic: 'values', signal: 'z' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicOpeningQuality([
      { topic: 'values', signal: 'opening' },
      { topic: 'values', signal: 'partial' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filters', () => {
    const r = summarizeDtmTopicOpeningQuality([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'opening-fully' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicOpeningQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicOpeningQuality([
      { topic: 'values', signal: 'opening-fully' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
