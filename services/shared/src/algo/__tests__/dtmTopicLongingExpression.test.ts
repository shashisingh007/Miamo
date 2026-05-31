import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicLongingExpression, detachedDtmTopics } from '../dtmTopicLongingExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicLongingExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicLongingExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicLongingExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('aching => yearning', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'aching' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('yearning');
  });

  it('yearning => mixed', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'yearning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('wistful => detached', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'wistful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('detached');
  });

  it('detached => detached', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'detached' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('detached');
  });

  it('mixed midpoint => wistful', () => {
    const r = summarizeDtmTopicLongingExpression([
      { topic: 'values', signal: 'aching' },
      { topic: 'values', signal: 'detached' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wistful');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'x', signal: 'aching' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicLongingExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicLongingExpression([
      { topic: 'values', signal: 'aching' },
      { topic: 'values', signal: 'wistful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('detachedDtmTopics filter', () => {
    const r = summarizeDtmTopicLongingExpression([
      { topic: 'values', signal: 'detached' },
      { topic: 'family', signal: 'wistful' },
      { topic: 'finance', signal: 'aching' },
    ]);
    expect(detachedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicLongingExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicLongingExpression([
      { topic: 'values', signal: 'aching' },
      { topic: 'family', signal: 'detached' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
