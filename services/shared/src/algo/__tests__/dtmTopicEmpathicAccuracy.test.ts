import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEmpathicAccuracy,
  misreadingDtmTopics,
} from '../dtmTopicEmpathicAccuracy';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEmpathicAccuracy', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicEmpathicAccuracy([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('precisely-attuned => accurate', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'precisely-attuned' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('accurate');
  });

  it('mostly-accurate (0.8) => approximate', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'mostly-accurate' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('approximate');
  });

  it('partial-read => approximate', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'partial-read' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('approximate');
  });

  it('misread => severely-misreading', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'misread' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('severely-misreading');
  });

  it('severely-misread => severely-misreading', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'severely-misread' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('severely-misreading');
  });

  it('mixed 0.5 => misreading', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'precisely-attuned' },
      { topic: 'communication', signal: 'severely-misread' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('misreading');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'x', signal: 'precisely-attuned' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'precisely-attuned' },
      { topic: 'communication', signal: 'mostly-accurate' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('misreadingDtmTopics includes both misreading bands', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'severely-misread' },
      { topic: 'family', signal: 'misread' },
      { topic: 'finance', signal: 'misread' },
      { topic: 'finance', signal: 'precisely-attuned' },
    ]);
    const m = misreadingDtmTopics(r);
    expect(m.length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([
      { topic: 'communication', signal: 'precisely-attuned' },
      { topic: 'family', signal: 'severely-misread' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicEmpathicAccuracy([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
