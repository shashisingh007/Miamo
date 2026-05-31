import { describe, it, expect } from 'vitest';
import { classifyQueueLag } from '../queueLagClassifier';

describe('queueLagClassifier', () => {
  it('empty backlog -> ok with eta 0', () => {
    const r = classifyQueueLag({ backlog: 0, throughputPerSec: 10 });
    expect(r.etaSeconds).toBe(0);
    expect(r.severity).toBe('ok');
  });

  it('eta within target -> ok', () => {
    const r = classifyQueueLag({ backlog: 500, throughputPerSec: 10, targetEtaSeconds: 60 });
    // eta=50s
    expect(r.etaSeconds).toBe(50);
    expect(r.severity).toBe('ok');
  });

  it('eta within 2x target -> warn', () => {
    const r = classifyQueueLag({ backlog: 900, throughputPerSec: 10, targetEtaSeconds: 60 });
    // eta=90s
    expect(r.severity).toBe('warn');
  });

  it('eta within 5x target -> degraded', () => {
    const r = classifyQueueLag({ backlog: 2000, throughputPerSec: 10, targetEtaSeconds: 60 });
    // eta=200s, > 120, <= 300
    expect(r.severity).toBe('degraded');
  });

  it('eta > 5x target -> critical', () => {
    const r = classifyQueueLag({ backlog: 10_000, throughputPerSec: 10, targetEtaSeconds: 60 });
    expect(r.severity).toBe('critical');
  });

  it('throughput=0 with backlog -> critical + stalled', () => {
    const r = classifyQueueLag({ backlog: 100, throughputPerSec: 0 });
    expect(r.severity).toBe('critical');
    expect(r.stalled).toBe(true);
    expect(r.etaSeconds).toBe(Infinity);
  });

  it('negative throughput treated as stalled', () => {
    const r = classifyQueueLag({ backlog: 100, throughputPerSec: -3 });
    expect(r.stalled).toBe(true);
  });

  it('NaN inputs clamp', () => {
    const r = classifyQueueLag({ backlog: NaN as any, throughputPerSec: 10 });
    expect(r.severity).toBe('ok');
  });

  it('default target=60s applies', () => {
    const r = classifyQueueLag({ backlog: 30, throughputPerSec: 1 });
    expect(r.etaSeconds).toBe(30);
    expect(r.severity).toBe('ok');
  });

  it('boundary: eta exactly = target stays ok', () => {
    const r = classifyQueueLag({ backlog: 60, throughputPerSec: 1, targetEtaSeconds: 60 });
    expect(r.severity).toBe('ok');
  });
});
