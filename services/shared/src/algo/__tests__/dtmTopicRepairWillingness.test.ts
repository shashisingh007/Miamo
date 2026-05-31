import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicRepairWillingness, refusingDtmTopics } from '../dtmTopicRepairWillingness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRepairWillingness', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicRepairWillingness([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRepairWillingness([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('eager => willing', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'eager' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('willing');
  });

  it('willing => reluctant', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'willing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reluctant');
  });

  it('reluctant => reluctant', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'reluctant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reluctant');
  });

  it('resistant => refusing', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'resistant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('refusing');
  });

  it('refusing => refusing', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'refusing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('refusing');
  });

  it('mixed 0.5 => resistant', () => {
    const r = summarizeDtmTopicRepairWillingness([
      { topic: 'values', signal: 'eager' },
      { topic: 'values', signal: 'refusing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resistant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'x', signal: 'eager' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicRepairWillingness([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRepairWillingness([
      { topic: 'values', signal: 'willing' },
      { topic: 'values', signal: 'reluctant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('refusingDtmTopics filters', () => {
    const r = summarizeDtmTopicRepairWillingness([
      { topic: 'values', signal: 'refusing' },
      { topic: 'family', signal: 'resistant' },
      { topic: 'finance', signal: 'eager' },
    ]);
    expect(refusingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicRepairWillingness([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRepairWillingness([
      { topic: 'values', signal: 'eager' },
      { topic: 'family', signal: 'refusing' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
