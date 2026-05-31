import { describe, it, expect } from 'vitest';
import { topicCooccurrence } from '../dtmTopicCooccurrence';

describe('dtmTopicCooccurrence', () => {
  it('empty input -> empty output', () => {
    expect(topicCooccurrence({ events: [] })).toEqual([]);
  });

  it('a single session of two topics returns one pair (after minCount)', () => {
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'growth' },
      ],
      minCount: 1,
    });
    expect(r).toEqual([{ a: 'values', b: 'growth', count: 1 }]);
  });

  it('respects minCount filter', () => {
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'growth' },
      ],
      minCount: 2,
    });
    expect(r).toEqual([]);
  });

  it('counts unique sessions, not duplicates within a session', () => {
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'growth' },
        { sessionId: 's2', topic: 'values' },
        { sessionId: 's2', topic: 'growth' },
      ],
      minCount: 1,
    });
    expect(r[0]).toEqual({ a: 'values', b: 'growth', count: 2 });
  });

  it('orders pairs in canonical index order (a before b)', () => {
    // 'growth' is index 7, 'values' is index 0 -> pair is (values, growth)
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'growth' },
        { sessionId: 's1', topic: 'values' },
      ],
      minCount: 1,
    });
    expect(r[0].a).toBe('values');
    expect(r[0].b).toBe('growth');
  });

  it('top-K trims to the strongest pairs', () => {
    const events = [
      ...['values', 'growth'].flatMap(t => ([1, 2, 3, 4]).map(n => ({ sessionId: `s${n}`, topic: t as any }))),
      ...['values', 'leisure'].flatMap(t => ([1, 2]).map(n => ({ sessionId: `t${n}`, topic: t as any }))),
      ...['conflict', 'finance'].flatMap(t => ([1]).map(n => ({ sessionId: `u${n}`, topic: t as any }))),
    ];
    const r = topicCooccurrence({ events, topK: 2, minCount: 1 });
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ a: 'values', b: 'growth', count: 4 });
    expect(r[1]).toEqual({ a: 'values', b: 'leisure', count: 2 });
  });

  it('triangulates 3-topic sessions into 3 pairs', () => {
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'growth' },
        { sessionId: 's1', topic: 'leisure' },
      ],
      minCount: 1,
    });
    expect(r).toHaveLength(3);
  });

  it('ignores unknown topics safely', () => {
    const r = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' },
        { sessionId: 's1', topic: 'not_a_topic' as any },
      ],
      minCount: 1,
    });
    expect(r).toEqual([]);
  });

  it('produces deterministic order on ties', () => {
    const a = topicCooccurrence({
      events: [
        { sessionId: 's1', topic: 'values' }, { sessionId: 's1', topic: 'growth' },
        { sessionId: 's2', topic: 'leisure' }, { sessionId: 's2', topic: 'faith' },
      ],
      minCount: 1, topK: 5,
    });
    const b = topicCooccurrence({
      events: [
        { sessionId: 's2', topic: 'faith' }, { sessionId: 's2', topic: 'leisure' },
        { sessionId: 's1', topic: 'growth' }, { sessionId: 's1', topic: 'values' },
      ],
      minCount: 1, topK: 5,
    });
    expect(a).toEqual(b);
  });
});
