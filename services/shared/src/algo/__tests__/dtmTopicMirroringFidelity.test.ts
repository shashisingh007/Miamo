import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicMirroringFidelity,
  distortedDtmTopics,
} from '../dtmTopicMirroringFidelity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMirroringFidelity', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicMirroringFidelity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicMirroringFidelity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('precise-mirror => mirrored', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'precise-mirror' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('mirrored');
  });

  it('mirroring (0.8) => approximate', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'mirroring' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('approximate');
  });

  it('paraphrase => approximate', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'paraphrase' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('approximate');
  });

  it('distorted-mirror => no-mirror', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'distorted-mirror' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('no-mirror');
  });

  it('no-mirror => no-mirror', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'no-mirror' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('no-mirror');
  });

  it('mixed 0.5 => distorted', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'precise-mirror' },
      { topic: 'communication', signal: 'no-mirror' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('distorted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicMirroringFidelity([{ topic: 'x', signal: 'precise-mirror' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'precise-mirror' },
      { topic: 'communication', signal: 'mirroring' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('distortedDtmTopics filters', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'no-mirror' },
      { topic: 'family', signal: 'distorted-mirror' },
      { topic: 'finance', signal: 'precise-mirror' },
    ]);
    expect(distortedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicMirroringFidelity([
      { topic: 'communication', signal: 'precise-mirror' },
      { topic: 'family', signal: 'no-mirror' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicMirroringFidelity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
