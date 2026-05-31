import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRoleNegotiation,
  imposedDtmTopics,
} from '../dtmTopicRoleNegotiation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRoleNegotiation', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicRoleNegotiation([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicRoleNegotiation([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('co-defined => co-authored', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'co-defined' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('co-authored');
  });

  it('renegotiated-openly => co-authored', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'renegotiated-openly' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('co-authored');
  });

  it('assumed-default (0.5) => assumed', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'assumed-default' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('assumed');
  });

  it('silent-pressure (0.25) => imposed', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'silent-pressure' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('imposed');
  });

  it('imposed => imposed', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'imposed' }]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('imposed');
  });

  it('mixed co-defined + imposed (0.5) => assumed', () => {
    const r = summarizeDtmTopicRoleNegotiation([
      { topic: 'parenting', signal: 'co-defined' },
      { topic: 'parenting', signal: 'imposed' },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.band).toBe('assumed');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'nope', signal: 'co-defined' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicRoleNegotiation([{ topic: 'parenting', signal: 'xyz' as any }]);
    expect(r.find((x) => x.topic === 'parenting')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRoleNegotiation([
      { topic: 'parenting', signal: 'co-defined' },
      { topic: 'parenting', signal: 'assumed-default' },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.n).toBe(2);
  });

  it('imposedDtmTopics filters', () => {
    const r = summarizeDtmTopicRoleNegotiation([
      { topic: 'parenting', signal: 'imposed' },
      { topic: 'family', signal: 'co-defined' },
    ]);
    const i = imposedDtmTopics(r);
    expect(i).toHaveLength(1);
    expect(i[0].topic).toBe('parenting');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicRoleNegotiation([
      { topic: 'parenting', signal: 'co-defined' },
      { topic: 'family', signal: 'imposed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicRoleNegotiation([
      { topic: 'future', signal: 'co-defined' },
      { topic: 'values', signal: 'imposed' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
