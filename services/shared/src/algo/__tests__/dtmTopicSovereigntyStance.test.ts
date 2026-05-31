import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSovereigntyStance, subjugatedDtmTopics } from '../dtmTopicSovereigntyStance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSovereigntyStance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSovereigntyStance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSovereigntyStance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('sovereign => autonomous', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'sovereign' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('autonomous');
  });

  it('autonomous => compliant', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'autonomous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('compliant');
  });

  it('compliant => compliant', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'compliant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('compliant');
  });

  it('enmeshed => subjugated', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'enmeshed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('subjugated');
  });

  it('subjugated => subjugated', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'subjugated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('subjugated');
  });

  it('mixed 0.5 => enmeshed', () => {
    const r = summarizeDtmTopicSovereigntyStance([
      { topic: 'values', signal: 'sovereign' },
      { topic: 'values', signal: 'subjugated' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('enmeshed');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'x', signal: 'sovereign' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSovereigntyStance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSovereigntyStance([
      { topic: 'values', signal: 'sovereign' },
      { topic: 'values', signal: 'enmeshed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('subjugatedDtmTopics filter', () => {
    const r = summarizeDtmTopicSovereigntyStance([
      { topic: 'values', signal: 'subjugated' },
      { topic: 'family', signal: 'enmeshed' },
      { topic: 'finance', signal: 'sovereign' },
    ]);
    expect(subjugatedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSovereigntyStance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSovereigntyStance([
      { topic: 'values', signal: 'sovereign' },
      { topic: 'family', signal: 'subjugated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
