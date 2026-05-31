import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTendernessExpression,
  coldDtmTopics,
} from '../dtmTopicTendernessExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTendernessExpression', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicTendernessExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTendernessExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('overt-tender => tender', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'overt-tender' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('tender');
  });

  it('soft-touch => warm', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'soft-touch' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('warm');
  });

  it('kind-gesture => warm', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'kind-gesture' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('warm');
  });

  it('detached => cold', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'detached' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('cold');
  });

  it('cold => cold', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'cold' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('cold');
  });

  it('mixed 0.5 => detached', () => {
    const r = summarizeDtmTopicTendernessExpression([
      { topic: 'intimacy', signal: 'overt-tender' },
      { topic: 'intimacy', signal: 'cold' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('detached');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'x', signal: 'overt-tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTendernessExpression([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTendernessExpression([
      { topic: 'intimacy', signal: 'overt-tender' },
      { topic: 'intimacy', signal: 'soft-touch' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('coldDtmTopics filters', () => {
    const r = summarizeDtmTopicTendernessExpression([
      { topic: 'intimacy', signal: 'cold' },
      { topic: 'family', signal: 'overt-tender' },
    ]);
    expect(coldDtmTopics(r)).toHaveLength(1);
    expect(coldDtmTopics(r)[0].topic).toBe('intimacy');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTendernessExpression([
      { topic: 'intimacy', signal: 'overt-tender' },
      { topic: 'family', signal: 'cold' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicTendernessExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
