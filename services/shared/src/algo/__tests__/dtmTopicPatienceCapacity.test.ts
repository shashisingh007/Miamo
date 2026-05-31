import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPatienceCapacity, impatientDtmTopics } from '../dtmTopicPatienceCapacity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPatienceCapacity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPatienceCapacity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPatienceCapacity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('patient => patient', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'patient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('patient');
  });

  it('steady => restless', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('restless');
  });

  it('restless => restless', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'restless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('restless');
  });

  it('irritable => impatient', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'irritable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('impatient => impatient', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'impatient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('mixed 0.5 => irritable', () => {
    const r = summarizeDtmTopicPatienceCapacity([
      { topic: 'values', signal: 'patient' },
      { topic: 'values', signal: 'impatient' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('irritable');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'x', signal: 'patient' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPatienceCapacity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPatienceCapacity([
      { topic: 'values', signal: 'steady' },
      { topic: 'values', signal: 'restless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('impatientDtmTopics filters', () => {
    const r = summarizeDtmTopicPatienceCapacity([
      { topic: 'values', signal: 'impatient' },
      { topic: 'family', signal: 'irritable' },
      { topic: 'finance', signal: 'patient' },
    ]);
    expect(impatientDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicPatienceCapacity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicPatienceCapacity([
      { topic: 'values', signal: 'patient' },
      { topic: 'family', signal: 'impatient' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
