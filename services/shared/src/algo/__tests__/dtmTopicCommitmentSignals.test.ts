import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCommitment,
  evasiveCommitmentDtmTopics,
} from '../dtmTopicCommitmentSignals';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicCommitmentSignals', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicCommitment([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicCommitment([])) expect(r.band).toBe('untested');
  });

  it('all public-claim => committed', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'future', signal: 'public-claim' },
      { topic: 'future', signal: 'public-claim' },
    ]);
    expect(r.find((x) => x.topic === 'future')!.band).toBe('committed');
  });

  it('all escape-hatch => evasive', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'finance', signal: 'escape-hatch' },
      { topic: 'finance', signal: 'escape-hatch' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('evasive');
  });

  it('all hedge => evasive', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'family', signal: 'hedge' },
      { topic: 'family', signal: 'hedge' },
    ]);
    // -0.5 -> (−0.5+1)/2 = 0.25 -> evasive
    expect(r.find((x) => x.topic === 'family')!.band).toBe('evasive');
  });

  it('all future-plan => committed', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'growth', signal: 'future-plan' },
      { topic: 'growth', signal: 'future-plan' },
    ]);
    // 0.7 -> 0.85 -> committed
    expect(r.find((x) => x.topic === 'growth')!.band).toBe('committed');
  });

  it('counts breakdown', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'social', signal: 'future-plan' },
      { topic: 'social', signal: 'exclusivity' },
      { topic: 'social', signal: 'public-claim' },
      { topic: 'social', signal: 'hedge' },
      { topic: 'social', signal: 'escape-hatch' },
    ]);
    const s = r.find((x) => x.topic === 'social')!;
    expect(s.events).toBe(5);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCommitment([{ topic: 'nope', signal: 'public-claim' }]);
    for (const row of r) expect(row.events).toBe(0);
  });

  it('ignores invalid signal', () => {
    const r = summarizeDtmTopicCommitment([{ topic: 'values', signal: 'wat' as any }]);
    expect(r.find((x) => x.topic === 'values')!.events).toBe(0);
  });

  it('mixed plan + hedge balances', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'leisure', signal: 'future-plan' },
      { topic: 'leisure', signal: 'hedge' },
    ]);
    // (0.7-0.5)/2=0.1 -> 0.55 -> tentative
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('tentative');
  });

  it('commitmentScore in [0,1]', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'intimacy', signal: 'exclusivity' },
    ]);
    const v = r.find((x) => x.topic === 'intimacy')!.commitmentScore;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('all 16 topics', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, signal: 'public-claim' });
    for (const r of summarizeDtmTopicCommitment(evs)) expect(r.band).toBe('committed');
  });

  it('evasiveCommitmentDtmTopics filter', () => {
    const r = summarizeDtmTopicCommitment([
      { topic: 'parenting', signal: 'escape-hatch' },
      { topic: 'faith', signal: 'public-claim' },
    ]);
    const evasive = evasiveCommitmentDtmTopics(r);
    expect(evasive).toContain('parenting');
    expect(evasive).not.toContain('faith');
  });

  it('single hedge => evasive', () => {
    const r = summarizeDtmTopicCommitment([{ topic: 'autonomy', signal: 'hedge' }]);
    expect(r.find((x) => x.topic === 'autonomy')!.band).toBe('evasive');
  });
});
