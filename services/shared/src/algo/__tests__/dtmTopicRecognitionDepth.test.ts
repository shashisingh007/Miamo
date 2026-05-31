import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRecognitionDepth,
  unrecognizedDtmTopics,
} from '../dtmTopicRecognitionDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRecognitionDepth', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicRecognitionDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRecognitionDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deeply-recognized => recognized', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'deeply-recognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('recognized');
  });

  it('recognized (0.8) => partial', () => {
    const r = summarizeDtmTopicRecognitionDepth([{ topic: 'values', signal: 'recognized' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('partially-recognized => partial', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'partially-recognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('partial');
  });

  it('misrecognized => unrecognized', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'misrecognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unrecognized');
  });

  it('unrecognized => unrecognized', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'unrecognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unrecognized');
  });

  it('mixed 0.5 => misrecognized', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'deeply-recognized' },
      { topic: 'values', signal: 'unrecognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('misrecognized');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'q', signal: 'deeply-recognized' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'recognized' },
      { topic: 'values', signal: 'recognized' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unrecognizedDtmTopics filters', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'unrecognized' },
      { topic: 'family', signal: 'misrecognized' },
      { topic: 'finance', signal: 'deeply-recognized' },
    ]);
    expect(unrecognizedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRecognitionDepth([
      { topic: 'values', signal: 'deeply-recognized' },
      { topic: 'family', signal: 'unrecognized' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicRecognitionDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
