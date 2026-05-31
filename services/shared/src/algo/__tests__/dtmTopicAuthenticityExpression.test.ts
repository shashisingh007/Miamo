import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAuthenticityExpression, maskedDtmTopics } from '../dtmTopicAuthenticityExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAuthenticityExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAuthenticityExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAuthenticityExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('aligned => authentic', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'aligned' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('authentic');
  });

  it('authentic => partial', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'authentic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('performative => masked', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'performative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('masked');
  });

  it('masked => masked', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'masked' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('masked');
  });

  it('mixed 0.5 => performative', () => {
    const r = summarizeDtmTopicAuthenticityExpression([
      { topic: 'values', signal: 'aligned' },
      { topic: 'values', signal: 'masked' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('performative');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'x', signal: 'aligned' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAuthenticityExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAuthenticityExpression([
      { topic: 'values', signal: 'aligned' },
      { topic: 'values', signal: 'performative' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('maskedDtmTopics filters', () => {
    const r = summarizeDtmTopicAuthenticityExpression([
      { topic: 'values', signal: 'masked' },
      { topic: 'family', signal: 'performative' },
      { topic: 'finance', signal: 'aligned' },
    ]);
    expect(maskedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAuthenticityExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAuthenticityExpression([
      { topic: 'values', signal: 'aligned' },
      { topic: 'family', signal: 'masked' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
