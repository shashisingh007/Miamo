import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAttunementEcho, tonedeafDtmTopics } from '../dtmTopicAttunementEcho';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAttunementEcho', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAttunementEcho([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAttunementEcho([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('mirroring => reflective', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'mirroring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reflective');
  });

  it('reflective => mixed', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'reflective' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('detached => tonedeaf', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'detached' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tonedeaf');
  });

  it('tonedeaf', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'tonedeaf' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tonedeaf');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAttunementEcho([
      { topic: 'values', signal: 'mirroring' },
      { topic: 'values', signal: 'tonedeaf' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('detached');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'x', signal: 'mirroring' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAttunementEcho([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAttunementEcho([
      { topic: 'values', signal: 'mirroring' },
      { topic: 'values', signal: 'tonedeaf' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('tonedeafDtmTopics filter', () => {
    const r = summarizeDtmTopicAttunementEcho([
      { topic: 'values', signal: 'tonedeaf' },
      { topic: 'family', signal: 'detached' },
      { topic: 'finance', signal: 'mirroring' },
    ]);
    expect(tonedeafDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAttunementEcho([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAttunementEcho([
      { topic: 'values', signal: 'mirroring' },
      { topic: 'family', signal: 'tonedeaf' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
