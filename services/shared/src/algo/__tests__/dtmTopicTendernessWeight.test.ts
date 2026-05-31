import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTendernessWeight,
  coldTendernessDtmTopics,
} from '../dtmTopicTendernessWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTendernessWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTendernessWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicTendernessWeight([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('cherishing => tender', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'cherishing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tender');
  });

  it('tender => mixed', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distant', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'distant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('cold', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cold');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicTendernessWeight([
      { topic: 'values', signal: 'cherishing' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'x', signal: 'cherishing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTendernessWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTendernessWeight([
      { topic: 'values', signal: 'cherishing' },
      { topic: 'values', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('cold filter', () => {
    const r = summarizeDtmTopicTendernessWeight([
      { topic: 'values', signal: 'cold' },
      { topic: 'family', signal: 'distant' },
      { topic: 'finance', signal: 'cherishing' },
    ]);
    expect(coldTendernessDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTendernessWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicTendernessWeight([
      { topic: 'values', signal: 'cherishing' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
