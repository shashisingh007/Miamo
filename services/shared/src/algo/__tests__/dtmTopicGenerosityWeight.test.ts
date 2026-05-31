import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicGenerosityWeight,
  withholdingDtmTopics,
} from '../dtmTopicGenerosityWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGenerosityWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGenerosityWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicGenerosityWeight([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('lavish => generous', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'lavish' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('generous');
  });

  it('generous => mixed', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'generous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('sparing', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'sparing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('withholding', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'withholding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicGenerosityWeight([
      { topic: 'values', signal: 'lavish' },
      { topic: 'values', signal: 'withholding' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sparing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'x', signal: 'lavish' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGenerosityWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGenerosityWeight([
      { topic: 'values', signal: 'lavish' },
      { topic: 'values', signal: 'withholding' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('withholdingDtmTopics filter', () => {
    const r = summarizeDtmTopicGenerosityWeight([
      { topic: 'values', signal: 'withholding' },
      { topic: 'family', signal: 'sparing' },
      { topic: 'finance', signal: 'lavish' },
    ]);
    expect(withholdingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGenerosityWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicGenerosityWeight([
      { topic: 'values', signal: 'lavish' },
      { topic: 'family', signal: 'withholding' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
