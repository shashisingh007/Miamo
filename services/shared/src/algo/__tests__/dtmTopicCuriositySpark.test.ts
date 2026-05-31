import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCuriositySpark,
  shutdownDtmTopics,
} from '../dtmTopicCuriositySpark';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCuriositySpark', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicCuriositySpark([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCuriositySpark([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('electric-curiosity => curious', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'electric-curiosity' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('curious');
  });

  it('curious (0.8) => interested', () => {
    const r = summarizeDtmTopicCuriositySpark([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('interested');
  });

  it('mild-interest => interested', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'mild-interest' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('interested');
  });

  it('flat => shutdown', () => {
    const r = summarizeDtmTopicCuriositySpark([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shutdown');
  });

  it('shutdown => shutdown', () => {
    const r = summarizeDtmTopicCuriositySpark([{ topic: 'values', signal: 'shutdown' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shutdown');
  });

  it('mixed 0.5 => flat', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'electric-curiosity' },
      { topic: 'values', signal: 'shutdown' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'q', signal: 'curious' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'bogus' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('shutdownDtmTopics filters', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'shutdown' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'electric-curiosity' },
    ]);
    expect(shutdownDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCuriositySpark([
      { topic: 'values', signal: 'electric-curiosity' },
      { topic: 'family', signal: 'shutdown' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicCuriositySpark([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
