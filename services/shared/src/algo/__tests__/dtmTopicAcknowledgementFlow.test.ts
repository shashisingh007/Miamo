import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAcknowledgementFlow, dismissedDtmTopics } from '../dtmTopicAcknowledgementFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAcknowledgementFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAcknowledgementFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('acknowledged', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'acknowledged' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('acknowledged');
  });

  it('recognized => mixed', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'recognized' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('overlooked => dismissed', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'overlooked' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissed');
  });

  it('dismissed', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'dismissed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissed');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([
      { topic: 'values', signal: 'acknowledged' },
      { topic: 'values', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('overlooked');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'x', signal: 'acknowledged' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([
      { topic: 'values', signal: 'acknowledged' },
      { topic: 'values', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dismissedDtmTopics filter', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([
      { topic: 'values', signal: 'dismissed' },
      { topic: 'family', signal: 'overlooked' },
      { topic: 'finance', signal: 'acknowledged' },
    ]);
    expect(dismissedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAcknowledgementFlow([
      { topic: 'values', signal: 'acknowledged' },
      { topic: 'family', signal: 'dismissed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
