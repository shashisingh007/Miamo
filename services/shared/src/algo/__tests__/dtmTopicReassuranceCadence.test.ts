import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicReassurance,
  coldReassuranceDtmTopics,
} from '../dtmTopicReassuranceCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const H = 60 * 60 * 1000;

describe('dtmTopicReassuranceCadence', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicReassurance([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicReassurance([])) expect(r.band).toBe('untested');
  });

  it('all reassured => safe', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'intimacy', kind: 'vulnerability', at: 0 },
      { topic: 'intimacy', kind: 'reassurance', at: H },
      { topic: 'intimacy', kind: 'vulnerability', at: 5 * H },
      { topic: 'intimacy', kind: 'reassurance', at: 6 * H },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('safe');
  });

  it('all ignored => cold', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'finance', kind: 'vulnerability', at: 0 },
      { topic: 'finance', kind: 'vulnerability', at: 100 * H },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('cold');
  });

  it('all dismissed => cold', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'conflict', kind: 'vulnerability', at: 0 },
      { topic: 'conflict', kind: 'dismissal', at: H },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('cold');
  });

  it('mixed => warm', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'family', kind: 'vulnerability', at: 0 },
      { topic: 'family', kind: 'reassurance', at: H },
      { topic: 'family', kind: 'vulnerability', at: 5 * H },
      { topic: 'family', kind: 'reassurance', at: 6 * H },
      { topic: 'family', kind: 'vulnerability', at: 10 * H },
      { topic: 'family', kind: 'reassurance', at: 11 * H },
      { topic: 'family', kind: 'vulnerability', at: 100 * H }, // ignored
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('warm');
  });

  it('inconsistent band', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'health', kind: 'vulnerability', at: 0 },
      { topic: 'health', kind: 'reassurance', at: H },
      { topic: 'health', kind: 'vulnerability', at: 5 * H },
      { topic: 'health', kind: 'dismissal', at: 6 * H },
      { topic: 'health', kind: 'vulnerability', at: 100 * H },
    ]);
    expect(r.find((x) => x.topic === 'health')!.band).toBe('inconsistent');
  });

  it('reassurance outside window does not count', () => {
    const r = summarizeDtmTopicReassurance(
      [
        { topic: 'growth', kind: 'vulnerability', at: 0 },
        { topic: 'growth', kind: 'reassurance', at: 1000 * H },
      ],
      { windowMs: 24 * H }
    );
    expect(r.find((x) => x.topic === 'growth')!.reassuredCount).toBe(0);
    expect(r.find((x) => x.topic === 'growth')!.ignoredCount).toBe(1);
  });

  it('counts vulnerabilities', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'social', kind: 'vulnerability', at: 0 },
      { topic: 'social', kind: 'vulnerability', at: 100 * H },
      { topic: 'social', kind: 'vulnerability', at: 200 * H },
    ]);
    expect(r.find((x) => x.topic === 'social')!.vulnerabilities).toBe(3);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'nope', kind: 'vulnerability', at: 0 },
    ]);
    for (const row of r) expect(row.vulnerabilities).toBe(0);
  });

  it('ignores invalid kind', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'values', kind: 'wat' as any, at: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.vulnerabilities).toBe(0);
  });

  it('ignores non-finite at', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'values', kind: 'vulnerability', at: NaN },
    ]);
    expect(r.find((x) => x.topic === 'values')!.vulnerabilities).toBe(0);
  });

  it('rejects bad windowMs', () => {
    expect(() => summarizeDtmTopicReassurance([], { windowMs: 0 })).toThrow();
    expect(() => summarizeDtmTopicReassurance([], { windowMs: -1 })).toThrow();
    expect(() => summarizeDtmTopicReassurance([], { windowMs: NaN })).toThrow();
  });

  it('dismissal short-circuits reassurance later', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'parenting', kind: 'vulnerability', at: 0 },
      { topic: 'parenting', kind: 'dismissal', at: H },
      { topic: 'parenting', kind: 'reassurance', at: 2 * H },
    ]);
    expect(r.find((x) => x.topic === 'parenting')!.dismissedCount).toBe(1);
    expect(r.find((x) => x.topic === 'parenting')!.reassuredCount).toBe(0);
  });

  it('silence is non-pairing', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'leisure', kind: 'vulnerability', at: 0 },
      { topic: 'leisure', kind: 'silence', at: H },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.ignoredCount).toBe(1);
  });

  it('coldReassuranceDtmTopics filter', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'autonomy', kind: 'vulnerability', at: 0 },
      { topic: 'autonomy', kind: 'dismissal', at: H },
      { topic: 'faith', kind: 'vulnerability', at: 0 },
      { topic: 'faith', kind: 'reassurance', at: H },
    ]);
    const cold = coldReassuranceDtmTopics(r);
    expect(cold).toContain('autonomy');
    expect(cold).not.toContain('faith');
  });

  it('reassuranceRate exact', () => {
    const r = summarizeDtmTopicReassurance([
      { topic: 'communication', kind: 'vulnerability', at: 0 },
      { topic: 'communication', kind: 'reassurance', at: H },
      { topic: 'communication', kind: 'vulnerability', at: 5 * H },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.reassuranceRate).toBeCloseTo(0.5, 6);
  });

  it('all 16 topics independent', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) {
      evs.push({ topic: t, kind: 'vulnerability', at: 0 });
      evs.push({ topic: t, kind: 'reassurance', at: H });
    }
    for (const r of summarizeDtmTopicReassurance(evs)) expect(r.band).toBe('safe');
  });
});
