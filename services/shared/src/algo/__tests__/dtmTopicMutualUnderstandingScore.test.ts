import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicMutualUnderstanding,
  attunedDtmTopics,
} from '../dtmTopicMutualUnderstandingScore';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicMutualUnderstandingScore', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicMutualUnderstanding([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicMutualUnderstanding([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'nope', signal: 'paraphrase' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'values', signal: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('all paraphrase => attuned', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'family', signal: 'paraphrase' },
      { topic: 'family', signal: 'paraphrase' },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.understandingScore).toBe(1);
    expect(f.band).toBe('attuned');
  });

  it('all misread => confused', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'conflict', signal: 'misread' },
      { topic: 'conflict', signal: 'misread' },
    ]);
    const c = r.find((x) => x.topic === 'conflict')!;
    expect(c.understandingScore).toBe(0);
    expect(c.band).toBe('confused');
  });

  it('all agreement => aligned', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'intimacy', signal: 'agreement' },
      { topic: 'intimacy', signal: 'agreement' },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    // weighted=0.6 per evt, mean=0.6 -> (0.6+1)/2=0.8 -> aligned
    expect(i.understandingScore).toBeCloseTo(0.8, 6);
    expect(i.band).toBe('aligned');
  });

  it('all clarification => partial', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'growth', signal: 'clarification' },
      { topic: 'growth', signal: 'clarification' },
    ]);
    // weighted=0.2 -> (0.2+1)/2 = 0.6 partial
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('partial');
  });

  it('silence drags toward confused', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'finance', signal: 'silence' },
      { topic: 'finance', signal: 'silence' },
      { topic: 'finance', signal: 'silence' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('confused');
  });

  it('mixed signals normalize within [0,1]', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'leisure', signal: 'paraphrase' },
      { topic: 'leisure', signal: 'misread' },
    ]);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(l.understandingScore).toBeCloseTo(0.5, 6);
    expect(l.band).toBe('partial');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'social', signal: 'paraphrase' },
      { topic: 'social', signal: 'agreement' },
      { topic: 'social', signal: 'clarification' },
      { topic: 'social', signal: 'misread' },
      { topic: 'social', signal: 'silence' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(5);
    expect(s.paraphrase + s.agreement + s.clarification + s.misread + s.silence).toBe(5);
  });

  it('attunedDtmTopics returns aligned + attuned', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'family', signal: 'paraphrase' },
      { topic: 'family', signal: 'paraphrase' },
      { topic: 'intimacy', signal: 'agreement' },
      { topic: 'intimacy', signal: 'agreement' },
      { topic: 'conflict', signal: 'misread' },
    ]);
    const a = attunedDtmTopics(r);
    expect(a).toContain('family');
    expect(a).toContain('intimacy');
    expect(a).not.toContain('conflict');
  });

  it('handles all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'paraphrase' });
    const r = summarizeDtmTopicMutualUnderstanding(evs);
    for (const row of r) expect(row.band).toBe('attuned');
  });

  it('score stable in [0,1]', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'autonomy', signal: 'misread' },
      { topic: 'autonomy', signal: 'misread' },
      { topic: 'autonomy', signal: 'paraphrase' },
      { topic: 'autonomy', signal: 'silence' },
    ]);
    const a = r.find((x) => x.topic === 'autonomy')!;
    expect(a.understandingScore).toBeGreaterThanOrEqual(0);
    expect(a.understandingScore).toBeLessThanOrEqual(1);
  });

  it('single paraphrase => attuned', () => {
    const r = summarizeDtmTopicMutualUnderstanding([{ topic: 'faith', signal: 'paraphrase' }]);
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('attuned');
  });

  it('single silence => confused', () => {
    const r = summarizeDtmTopicMutualUnderstanding([{ topic: 'health', signal: 'silence' }]);
    expect(r.find((x) => x.topic === 'health')!.band).toBe('confused');
  });

  it('clarification balances mild misread => partial', () => {
    const r = summarizeDtmTopicMutualUnderstanding([
      { topic: 'ambition', signal: 'clarification' },
      { topic: 'ambition', signal: 'clarification' },
      { topic: 'ambition', signal: 'paraphrase' },
      { topic: 'ambition', signal: 'misread' },
    ]);
    const a = r.find((x) => x.topic === 'ambition')!;
    // weighted = 0.2+0.2+1.0-1.0 = 0.4; mean=0.1; (0.1+1)/2=0.55 partial
    expect(a.band).toBe('partial');
  });
});
