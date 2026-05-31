import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicDrift, driftedDtmTopics } from '../dtmTopicDriftDetector';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicDriftDetector', () => {
  it('canonical row order', () => {
    const s = summarizeDtmTopicDrift([]);
    expect(s.rows.map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty input => stable, zero divergence', () => {
    const s = summarizeDtmTopicDrift([]);
    expect(s.divergence).toBe(0);
    expect(s.band).toBe('stable');
    expect(s.pivotMs).toBeNull();
    for (const r of s.rows) {
      expect(r.delta).toBe(0);
      expect(r.band).toBe('stable');
    }
  });

  it('ignores unknown topics', () => {
    const s = summarizeDtmTopicDrift([{ topic: 'nope', ts: 1 }]);
    expect(s.pivotMs).toBeNull();
  });

  it('uses provided pivotMs', () => {
    const s = summarizeDtmTopicDrift(
      [
        { topic: 'finance', ts: 10 },
        { topic: 'finance', ts: 30 },
      ],
      { pivotMs: 20 }
    );
    expect(s.pivotMs).toBe(20);
    const r = s.rows.find((x) => x.topic === 'finance')!;
    expect(r.earlyShare).toBe(1);
    expect(r.recentShare).toBe(1);
    expect(r.delta).toBe(0);
  });

  it('detects a single topic spiking', () => {
    const evs: any[] = [
      { topic: 'values', ts: 1 },
      { topic: 'family', ts: 2 },
      { topic: 'health', ts: 3 },
      { topic: 'finance', ts: 100 },
      { topic: 'finance', ts: 101 },
      { topic: 'finance', ts: 102 },
    ];
    const s = summarizeDtmTopicDrift(evs);
    const fin = s.rows.find((x) => x.topic === 'finance')!;
    expect(fin.recentShare).toBe(1);
    expect(fin.earlyShare).toBe(0);
    expect(fin.band).toBe('spiking');
  });

  it('detects a topic cooling', () => {
    const evs: any[] = [];
    for (let i = 0; i < 3; i++) evs.push({ topic: 'leisure', ts: i });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'values', ts: 100 + i });
    const s = summarizeDtmTopicDrift(evs);
    const lei = s.rows.find((x) => x.topic === 'leisure')!;
    expect(lei.earlyShare).toBe(1);
    expect(lei.recentShare).toBe(0);
    expect(lei.band).toBe('cooling');
  });

  it('divergence is sum |delta| / 2', () => {
    const evs: any[] = [
      { topic: 'family', ts: 1 },
      { topic: 'family', ts: 2 },
      { topic: 'finance', ts: 100 },
      { topic: 'finance', ts: 101 },
    ];
    const s = summarizeDtmTopicDrift(evs);
    expect(s.divergence).toBeCloseTo(1);
    expect(s.band).toBe('volatile');
  });

  it('completely stable distribution => stable band', () => {
    const evs: any[] = [];
    for (let i = 0; i < 5; i++) {
      evs.push({ topic: 'values', ts: i });
      evs.push({ topic: 'family', ts: i });
    }
    for (let i = 0; i < 5; i++) {
      evs.push({ topic: 'values', ts: 100 + i });
      evs.push({ topic: 'family', ts: 100 + i });
    }
    const s = summarizeDtmTopicDrift(evs);
    expect(s.divergence).toBeCloseTo(0);
    expect(s.band).toBe('stable');
  });

  it('small delta => warming band', () => {
    const s = summarizeDtmTopicDrift(
      [
        { topic: 'values', ts: 1 },
        { topic: 'values', ts: 2 },
        { topic: 'family', ts: 3 },
        { topic: 'family', ts: 4 },
        { topic: 'values', ts: 100 },
        { topic: 'values', ts: 101 },
        { topic: 'values', ts: 102 },
        { topic: 'family', ts: 103 },
      ],
      { pivotMs: 50 }
    );
    const v = s.rows.find((x) => x.topic === 'values')!;
    expect(v.earlyShare).toBe(0.5);
    expect(v.recentShare).toBe(0.75);
    expect(v.delta).toBeCloseTo(0.25);
    expect(v.band).toBe('spiking');
  });

  it('overall band shifting threshold', () => {
    // delta values about 0.2 on two topics => divergence 0.2
    const s = summarizeDtmTopicDrift(
      [
        { topic: 'values', ts: 1 },
        { topic: 'values', ts: 2 },
        { topic: 'values', ts: 3 },
        { topic: 'family', ts: 4 },
        { topic: 'family', ts: 5 },
        { topic: 'values', ts: 100 },
        { topic: 'values', ts: 101 },
        { topic: 'family', ts: 102 },
        { topic: 'family', ts: 103 },
        { topic: 'family', ts: 104 },
      ],
      { pivotMs: 50 }
    );
    expect(s.divergence).toBeCloseTo(0.2);
    expect(s.band).toBe('shifting');
  });

  it('driftedDtmTopics returns spiking + cooling only', () => {
    const evs: any[] = [
      { topic: 'finance', ts: 100 },
      { topic: 'finance', ts: 101 },
      { topic: 'leisure', ts: 1 },
      { topic: 'leisure', ts: 2 },
    ];
    const s = summarizeDtmTopicDrift(evs);
    const drifted = driftedDtmTopics(s.rows);
    expect(drifted).toContain('finance');
    expect(drifted).toContain('leisure');
    expect(drifted).not.toContain('values');
  });

  it('pivot when explicit & no early events => zero earlyShare for all', () => {
    const s = summarizeDtmTopicDrift(
      [
        { topic: 'values', ts: 100 },
        { topic: 'family', ts: 101 },
      ],
      { pivotMs: 0 }
    );
    for (const r of s.rows) expect(r.earlyShare).toBe(0);
  });

  it('rows length always 16', () => {
    expect(summarizeDtmTopicDrift([]).rows.length).toBe(16);
  });

  it('delta bounded -1..+1', () => {
    const evs: any[] = [
      { topic: 'finance', ts: 100 },
      { topic: 'finance', ts: 101 },
      { topic: 'leisure', ts: 1 },
      { topic: 'leisure', ts: 2 },
    ];
    const s = summarizeDtmTopicDrift(evs);
    for (const r of s.rows) {
      expect(r.delta).toBeGreaterThanOrEqual(-1);
      expect(r.delta).toBeLessThanOrEqual(1);
    }
  });
});
