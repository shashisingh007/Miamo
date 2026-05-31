import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAutonomyExpression, controlledDtmTopics } from '../dtmTopicAutonomyExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAutonomyExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAutonomyExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAutonomyExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('autonomous', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'autonomous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('autonomous');
  });

  it('self-led => mixed', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'self-led' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('enmeshed', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'enmeshed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('controlled');
  });

  it('controlled', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'controlled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('controlled');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAutonomyExpression([
      { topic: 'values', signal: 'autonomous' },
      { topic: 'values', signal: 'controlled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('enmeshed');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'x', signal: 'autonomous' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAutonomyExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAutonomyExpression([
      { topic: 'values', signal: 'autonomous' },
      { topic: 'values', signal: 'controlled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('controlledDtmTopics filter', () => {
    const r = summarizeDtmTopicAutonomyExpression([
      { topic: 'values', signal: 'controlled' },
      { topic: 'family', signal: 'enmeshed' },
      { topic: 'finance', signal: 'autonomous' },
    ]);
    expect(controlledDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAutonomyExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAutonomyExpression([
      { topic: 'values', signal: 'autonomous' },
      { topic: 'family', signal: 'controlled' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
