import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicValuesAlignment,
  fracturedDtmTopics,
} from '../dtmTopicValuesAlignment';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicValuesAlignment', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicValuesAlignment([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicValuesAlignment([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('shared-affirm => aligned', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'shared-affirm' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.band).toBe('aligned');
  });

  it('common-ground => overlapping (0.85)', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'common-ground' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.band).toBe('aligned');
  });

  it('agree-to-disagree => overlapping (0.7)', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'agree-to-disagree' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.band).toBe('overlapping');
  });

  it('value-clash => fractured (0.2)', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'value-clash' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.band).toBe('fractured');
  });

  it('value-violation => fractured', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'value-violation' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.band).toBe('fractured');
  });

  it('mixed shared-affirm + value-violation => tension', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'shared-affirm' },
      { topic: 'values', signal: 'value-violation' },
    ]);
    const r = rows.find((x) => x.topic === 'values')!;
    expect(r.score).toBeCloseTo(0.5, 5);
    expect(r.band).toBe('tension');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'nope', signal: 'shared-affirm' },
    ]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'meh' as any },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'shared-affirm' },
      { topic: 'values', signal: 'common-ground' },
      { topic: 'family', signal: 'value-violation' },
    ]);
    expect(rows.find((r) => r.topic === 'values')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('fracturedDtmTopics filters', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'value-violation' },
      { topic: 'family', signal: 'shared-affirm' },
    ]);
    const f = fracturedDtmTopics(rows);
    expect(f).toHaveLength(1);
    expect(f[0].topic).toBe('values');
  });

  it('scores bounded in [0,1]', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'values', signal: 'shared-affirm' },
      { topic: 'family', signal: 'value-violation' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicValuesAlignment([
      { topic: 'future', signal: 'shared-affirm' },
      { topic: 'values', signal: 'value-violation' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
