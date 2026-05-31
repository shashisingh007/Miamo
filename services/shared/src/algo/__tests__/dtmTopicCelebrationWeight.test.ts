import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCelebrationWeight,
  absentCelebrationDtmTopics,
} from '../dtmTopicCelebrationWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCelebrationWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCelebrationWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicCelebrationWeight([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('exuberant => celebratory', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'exuberant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('celebratory');
  });

  it('celebratory => mixed', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'celebratory' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('muted', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'muted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid mix => muted', () => {
    const r = summarizeDtmTopicCelebrationWeight([
      { topic: 'values', signal: 'exuberant' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('muted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'x', signal: 'exuberant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCelebrationWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCelebrationWeight([
      { topic: 'values', signal: 'exuberant' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absent filter', () => {
    const r = summarizeDtmTopicCelebrationWeight([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'muted' },
      { topic: 'finance', signal: 'exuberant' },
    ]);
    expect(absentCelebrationDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCelebrationWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicCelebrationWeight([
      { topic: 'values', signal: 'exuberant' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
