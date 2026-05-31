import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicMatteringAffirmation,
  dismissedDtmTopics,
} from '../dtmTopicMatteringAffirmation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMatteringAffirmation', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicMatteringAffirmation([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicMatteringAffirmation([]).every((x) => x.band === 'untested')).toBe(
      true,
    );
  });

  it('deeply-affirmed => affirmed', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'deeply-affirmed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('affirmed');
  });

  it('affirmed (0.8) => acknowledged', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'affirmed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledged');
  });

  it('acknowledged => acknowledged', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'acknowledged' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledged');
  });

  it('minimized => dismissed', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'minimized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissed');
  });

  it('dismissed => dismissed', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissed');
  });

  it('mixed 0.5 => minimized', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'deeply-affirmed' },
      { topic: 'values', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('minimized');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicMatteringAffirmation([{ topic: 'q', signal: 'affirmed' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'x' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'affirmed' },
      { topic: 'values', signal: 'acknowledged' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dismissedDtmTopics filters', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'dismissed' },
      { topic: 'family', signal: 'minimized' },
      { topic: 'finance', signal: 'deeply-affirmed' },
    ]);
    expect(dismissedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicMatteringAffirmation([
      { topic: 'values', signal: 'deeply-affirmed' },
      { topic: 'family', signal: 'dismissed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicMatteringAffirmation([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
