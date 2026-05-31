import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCherishingExpression, diminishingDtmTopics } from '../dtmTopicCherishingExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCherishingExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCherishingExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCherishingExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('cherishing => valuing', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'cherishing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('valuing');
  });

  it('valuing => tolerating', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'valuing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tolerating');
  });

  it('tolerating => tolerating', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'tolerating' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tolerating');
  });

  it('overlooking => diminishing', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'overlooking' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('diminishing');
  });

  it('diminishing => diminishing', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'diminishing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('diminishing');
  });

  it('mixed 0.5 => overlooking', () => {
    const r = summarizeDtmTopicCherishingExpression([
      { topic: 'values', signal: 'cherishing' },
      { topic: 'values', signal: 'diminishing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('overlooking');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'x', signal: 'valuing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCherishingExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCherishingExpression([
      { topic: 'values', signal: 'valuing' },
      { topic: 'values', signal: 'tolerating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('diminishingDtmTopics filters', () => {
    const r = summarizeDtmTopicCherishingExpression([
      { topic: 'values', signal: 'diminishing' },
      { topic: 'family', signal: 'overlooking' },
      { topic: 'finance', signal: 'cherishing' },
    ]);
    expect(diminishingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicCherishingExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCherishingExpression([
      { topic: 'values', signal: 'cherishing' },
      { topic: 'family', signal: 'diminishing' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
