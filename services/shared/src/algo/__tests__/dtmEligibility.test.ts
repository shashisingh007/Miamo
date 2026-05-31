import { describe, it, expect } from 'vitest';
import { filterDtmEligibility } from '../dtmEligibility';

const me = 'me';
const cand = (id: string, coveredCount = 8, optOut = false) => ({ id, coveredCount, optOut });

describe('filterDtmEligibility', () => {
  it('rejects self', () => {
    const r = filterDtmEligibility([cand(me)], { meId: me, meCoveredCount: 8 });
    expect(r.pass).toHaveLength(0);
    expect(r.reject[0].reason).toBe('self');
  });

  it('rejects blocked candidates', () => {
    const r = filterDtmEligibility([cand('b1')], {
      meId: me, meCoveredCount: 8, blockSet: new Set(['b1']),
    });
    expect(r.reject[0].reason).toBe('blocked');
  });

  it('rejects entire list when asker opted out', () => {
    const r = filterDtmEligibility([cand('a'), cand('b')], {
      meId: me, meCoveredCount: 8, meOptOut: true,
    });
    expect(r.pass).toHaveLength(0);
    expect(r.reject.every((x) => x.reason === 'opt_out')).toBe(true);
  });

  it('rejects entire list when asker has no DTM vector', () => {
    const r = filterDtmEligibility([cand('a')], { meId: me, meCoveredCount: 0 });
    expect(r.reject[0].reason).toBe('me_no_dtm');
  });

  it('rejects entire list when asker has too few topics', () => {
    const r = filterDtmEligibility([cand('a')], { meId: me, meCoveredCount: 2, minTopicsMe: 4 });
    expect(r.reject[0].reason).toBe('me_insufficient_dtm');
  });

  it('rejects per-candidate when candidate has no DTM', () => {
    const r = filterDtmEligibility([cand('a', 0)], { meId: me, meCoveredCount: 8 });
    expect(r.reject[0].reason).toBe('cand_no_dtm');
  });

  it('rejects per-candidate when candidate covers too few topics', () => {
    const r = filterDtmEligibility([cand('a', 2)], { meId: me, meCoveredCount: 8, minTopicsCand: 4 });
    expect(r.reject[0].reason).toBe('cand_insufficient_dtm');
  });

  it('rejects per-candidate opt-out', () => {
    const r = filterDtmEligibility([cand('a', 8, true)], { meId: me, meCoveredCount: 8 });
    expect(r.reject[0].reason).toBe('opt_out');
  });

  it('passes well-formed eligible candidates', () => {
    const r = filterDtmEligibility([cand('a'), cand('b')], { meId: me, meCoveredCount: 8 });
    expect(r.pass).toHaveLength(2);
    expect(r.reject).toHaveLength(0);
  });

  it('honours custom thresholds', () => {
    const r = filterDtmEligibility([cand('a', 6)], {
      meId: me, meCoveredCount: 6, minTopicsMe: 6, minTopicsCand: 6,
    });
    expect(r.pass).toHaveLength(1);
  });
});
