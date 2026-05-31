import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAdmirationFlow,
  contemptDtmTopics,
} from '../dtmTopicAdmirationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAdmirationFlow', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicAdmirationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAdmirationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deep-admiration => admiring', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'deep-admiration' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('admiring');
  });

  it('open-praise => acknowledging', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'open-praise' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledging');
  });

  it('acknowledgement => acknowledging', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'acknowledgement' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledging');
  });

  it('critical-stance => contempt', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'critical-stance' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('contempt');
  });

  it('contempt => contempt', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'contempt' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('contempt');
  });

  it('mixed 0.5 => critical', () => {
    const r = summarizeDtmTopicAdmirationFlow([
      { topic: 'values', signal: 'deep-admiration' },
      { topic: 'values', signal: 'contempt' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('critical');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'x', signal: 'deep-admiration' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAdmirationFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAdmirationFlow([
      { topic: 'values', signal: 'deep-admiration' },
      { topic: 'values', signal: 'open-praise' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('contemptDtmTopics filters', () => {
    const r = summarizeDtmTopicAdmirationFlow([
      { topic: 'values', signal: 'contempt' },
      { topic: 'family', signal: 'deep-admiration' },
    ]);
    expect(contemptDtmTopics(r)).toHaveLength(1);
    expect(contemptDtmTopics(r)[0].topic).toBe('values');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAdmirationFlow([
      { topic: 'values', signal: 'deep-admiration' },
      { topic: 'family', signal: 'contempt' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicAdmirationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
