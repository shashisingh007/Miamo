import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAttunementDepth, shallowAttunementDtmTopics } from '../dtmTopicAttunementDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAttunementDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAttunementDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAttunementDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deep => attuned', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'deep' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('attuned');
  });

  it('attuned => partial', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'attuned' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partial => partial', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('shallow => absent', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'shallow' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mixed 0.5 => shallow', () => {
    const r = summarizeDtmTopicAttunementDepth([
      { topic: 'values', signal: 'deep' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shallow');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'x', signal: 'deep' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAttunementDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAttunementDepth([
      { topic: 'values', signal: 'attuned' },
      { topic: 'values', signal: 'partial' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('shallowAttunementDtmTopics filters', () => {
    const r = summarizeDtmTopicAttunementDepth([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'shallow' },
      { topic: 'finance', signal: 'deep' },
    ]);
    expect(shallowAttunementDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAttunementDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAttunementDepth([
      { topic: 'values', signal: 'deep' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
