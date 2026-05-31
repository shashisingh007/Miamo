import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicVisionAlignment,
  opposedDtmTopics,
} from '../dtmTopicVisionAlignment';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicVisionAlignment', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicVisionAlignment([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicVisionAlignment([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('shared-vision => aligned', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'shared-vision' }]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('aligned');
  });

  it('aligned (0.8) => partial', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'aligned' }]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('partial');
  });

  it('partial (0.55) => partial', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('partial');
  });

  it('diverging (0.25) => opposed', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'diverging' }]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('opposed');
  });

  it('opposed => opposed', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'opposed' }]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('opposed');
  });

  it('mixed (0.5) => diverging', () => {
    const r = summarizeDtmTopicVisionAlignment([
      { topic: 'future', signal: 'shared-vision' },
      { topic: 'future', signal: 'opposed' },
    ]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('diverging');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'x', signal: 'shared-vision' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicVisionAlignment([{ topic: 'future', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'future')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicVisionAlignment([
      { topic: 'future', signal: 'shared-vision' },
      { topic: 'future', signal: 'aligned' },
    ]);
    expect(r.find((x) => x.topic === 'future')!.n).toBe(2);
  });

  it('opposedDtmTopics filters', () => {
    const r = summarizeDtmTopicVisionAlignment([
      { topic: 'future', signal: 'opposed' },
      { topic: 'leisure', signal: 'shared-vision' },
    ]);
    expect(opposedDtmTopics(r)).toHaveLength(1);
    expect(opposedDtmTopics(r)[0].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicVisionAlignment([
      { topic: 'future', signal: 'shared-vision' },
      { topic: 'leisure', signal: 'opposed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicVisionAlignment([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
