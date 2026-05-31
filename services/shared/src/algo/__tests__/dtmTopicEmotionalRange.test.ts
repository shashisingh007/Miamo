import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicEmotionalRange,
  flatDtmTopics,
} from '../dtmTopicEmotionalRange';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEmotionalRange', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicEmotionalRange([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicEmotionalRange([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('full-spectrum => full-spectrum band', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'full-spectrum' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('full-spectrum');
  });

  it('expressive (0.8) => expressive', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'expressive' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('expressive');
  });

  it('measured (0.55) => expressive', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'measured' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('expressive');
  });

  it('guarded (0.25) => flat', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('flat');
  });

  it('flat => flat', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('flat');
  });

  it('mixed (0.5) => guarded', () => {
    const r = summarizeDtmTopicEmotionalRange([
      { topic: 'intimacy', signal: 'full-spectrum' },
      { topic: 'intimacy', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('guarded');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'x', signal: 'full-spectrum' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicEmotionalRange([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEmotionalRange([
      { topic: 'intimacy', signal: 'full-spectrum' },
      { topic: 'intimacy', signal: 'expressive' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('flatDtmTopics filters', () => {
    const r = summarizeDtmTopicEmotionalRange([
      { topic: 'intimacy', signal: 'flat' },
      { topic: 'leisure', signal: 'full-spectrum' },
    ]);
    expect(flatDtmTopics(r)).toHaveLength(1);
    expect(flatDtmTopics(r)[0].topic).toBe('intimacy');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicEmotionalRange([
      { topic: 'intimacy', signal: 'full-spectrum' },
      { topic: 'leisure', signal: 'flat' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicEmotionalRange([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
