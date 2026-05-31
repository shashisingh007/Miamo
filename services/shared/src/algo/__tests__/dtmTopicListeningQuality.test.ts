import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicListeningQuality,
  interruptingDtmTopics,
} from '../dtmTopicListeningQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicListeningQuality', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicListeningQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicListeningQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reflective => reflective', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'reflective' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('reflective');
  });

  it('engaged (0.8) => engaged', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'engaged' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('engaged');
  });

  it('neutral (0.55) => engaged', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'neutral' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('engaged');
  });

  it('half-listening (0.25) => interrupting', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'half-listening' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('interrupting');
  });

  it('interrupting => interrupting', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'interrupting' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('interrupting');
  });

  it('mixed reflective + interrupting (0.5) => shallow', () => {
    const r = summarizeDtmTopicListeningQuality([
      { topic: 'communication', signal: 'reflective' },
      { topic: 'communication', signal: 'interrupting' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('shallow');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'xx', signal: 'reflective' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicListeningQuality([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicListeningQuality([
      { topic: 'communication', signal: 'reflective' },
      { topic: 'communication', signal: 'interrupting' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('interruptingDtmTopics filters', () => {
    const r = summarizeDtmTopicListeningQuality([
      { topic: 'communication', signal: 'interrupting' },
      { topic: 'family', signal: 'reflective' },
    ]);
    expect(interruptingDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicListeningQuality([
      { topic: 'communication', signal: 'reflective' },
      { topic: 'family', signal: 'interrupting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicListeningQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
