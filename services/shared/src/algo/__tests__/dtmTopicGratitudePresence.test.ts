import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicGratitudePresence,
  absentGratitudeDtmTopics,
} from '../dtmTopicGratitudePresence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudePresence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGratitudePresence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicGratitudePresence([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('profound => present band', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'profound' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('present');
  });

  it('present => mixed band', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'present' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('shallow', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'shallow' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicGratitudePresence([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shallow');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'x', signal: 'profound' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGratitudePresence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGratitudePresence([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentGratitudeDtmTopics filter', () => {
    const r = summarizeDtmTopicGratitudePresence([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'shallow' },
      { topic: 'finance', signal: 'profound' },
    ]);
    expect(absentGratitudeDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGratitudePresence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicGratitudePresence([
      { topic: 'values', signal: 'profound' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
