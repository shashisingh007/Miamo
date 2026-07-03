import { describe, it, expect } from 'vitest';
import {
  scoreProfileHealth,
  healthContribSum,
  MAX_PENALTY,
  COLD_START_HEALTH,
  type ProfileHealthInput,
} from '../../v9/profileHealth';

const base: ProfileHealthInput = {
  photoCount: 3,
  bioLengthChars: 150,
  promptCount: 3,
  verified: true,
  responseRate: 1,
  ghostRate: 0,
  daysSinceLastActive: 1,
};

describe('v9/profileHealth', () => {
  it('healthContribSum is exactly 1.0', () => {
    expect(healthContribSum()).toBeCloseTo(1, 6);
  });

  it('perfect profile → healthScore = 1, penalty = 0', () => {
    const r = scoreProfileHealth(base);
    expect(r.healthScore).toBeCloseTo(1, 6);
    expect(r.penalty).toBeCloseTo(0, 6);
  });

  it('penalty is always in [0, MAX_PENALTY]', () => {
    const inputs: ProfileHealthInput[] = [
      base,
      { ...base, photoCount: 0, bioLengthChars: 0, promptCount: 0, verified: false, responseRate: 0, ghostRate: 1, daysSinceLastActive: 90 },
      { ...base, ghostRate: 0.5 },
      { ...base, responseRate: 0.5 },
    ];
    for (const inp of inputs) {
      const r = scoreProfileHealth(inp);
      expect(r.penalty).toBeGreaterThanOrEqual(0);
      expect(r.penalty).toBeLessThanOrEqual(MAX_PENALTY);
    }
  });

  it('cold-start profile (1 photo, no bio, no prompts, no history) → COLD_START_HEALTH', () => {
    const r = scoreProfileHealth({
      photoCount: 1,
      bioLengthChars: 0,
      promptCount: 0,
      verified: false,
      responseRate: 0,
      ghostRate: 0,
      daysSinceLastActive: 0,
    });
    expect(r.healthScore).toBeCloseTo(COLD_START_HEALTH, 6);
    expect(r.penalty).toBeCloseTo((1 - COLD_START_HEALTH) * MAX_PENALTY, 6);
    expect(r.reasons.some((x) => x.includes('new profile'))).toBe(true);
  });

  it('completely empty profile also cold-start', () => {
    const r = scoreProfileHealth({
      photoCount: 0,
      bioLengthChars: 0,
      promptCount: 0,
      verified: false,
      responseRate: 0,
      ghostRate: 0,
      daysSinceLastActive: 5,
    });
    expect(r.healthScore).toBeCloseTo(COLD_START_HEALTH, 6);
  });

  it('ghosting user with content is NOT cold-start', () => {
    const r = scoreProfileHealth({
      photoCount: 4,
      bioLengthChars: 100,
      promptCount: 2,
      verified: false,
      responseRate: 0.1,
      ghostRate: 0.8,
      daysSinceLastActive: 3,
    });
    expect(r.healthScore).toBeLessThan(0.6);
    expect(r.reasons.some((x) => x.includes('ghosts'))).toBe(true);
  });

  it('healthScore monotonic in responseRate (all else equal)', () => {
    const lo = scoreProfileHealth({ ...base, responseRate: 0.1 }).healthScore;
    const mid = scoreProfileHealth({ ...base, responseRate: 0.5 }).healthScore;
    const hi = scoreProfileHealth({ ...base, responseRate: 0.9 }).healthScore;
    expect(hi).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(lo);
  });

  it('healthScore monotonic (non-increasing) in ghostRate', () => {
    let prev = Infinity;
    for (let g = 0; g <= 1; g += 0.1) {
      const r = scoreProfileHealth({ ...base, ghostRate: g });
      expect(r.healthScore).toBeLessThanOrEqual(prev + 1e-9);
      prev = r.healthScore;
    }
  });

  it('healthScore monotonic non-increasing in daysSinceLastActive', () => {
    let prev = Infinity;
    for (const d of [0, 7, 14, 21, 30, 45, 60, 90]) {
      const r = scoreProfileHealth({ ...base, daysSinceLastActive: d });
      expect(r.healthScore).toBeLessThanOrEqual(prev + 1e-9);
      prev = r.healthScore;
    }
  });

  it('activity contribution decays smoothly between 14 and 60 days', () => {
    const r14 = scoreProfileHealth({ ...base, daysSinceLastActive: 14 }).healthScore;
    const r30 = scoreProfileHealth({ ...base, daysSinceLastActive: 30 }).healthScore;
    const r60 = scoreProfileHealth({ ...base, daysSinceLastActive: 60 }).healthScore;
    expect(r14).toBeGreaterThan(r30);
    expect(r30).toBeGreaterThan(r60);
  });

  it('verified badge adds a real contribution', () => {
    const v = scoreProfileHealth({ ...base, verified: true }).healthScore;
    const nv = scoreProfileHealth({ ...base, verified: false }).healthScore;
    expect(v).toBeGreaterThan(nv);
  });

  it('penalty is complement: (1 - health) * MAX_PENALTY', () => {
    const inputs = [base, { ...base, responseRate: 0.5 }, { ...base, ghostRate: 0.7 }];
    for (const inp of inputs) {
      const r = scoreProfileHealth(inp);
      expect(r.penalty).toBeCloseTo((1 - r.healthScore) * MAX_PENALTY, 6);
    }
  });

  it('reasons include "verified" only when verified=true', () => {
    const rV = scoreProfileHealth({ ...base, verified: true });
    const rN = scoreProfileHealth({ ...base, verified: false });
    expect(rV.reasons).toContain('verified');
    expect(rN.reasons).not.toContain('verified');
  });

  it('reasons flag "no photos" for 0 photos', () => {
    const r = scoreProfileHealth({
      ...base,
      photoCount: 0,
      responseRate: 0.5, // avoid cold-start
      bioLengthChars: 50,
      promptCount: 1,
    });
    expect(r.reasons).toContain('no photos');
  });

  it('reasons flag "short bio" for < 40 chars (when not cold-start)', () => {
    const r = scoreProfileHealth({
      ...base,
      bioLengthChars: 20,
      photoCount: 3,
      promptCount: 1,
      responseRate: 0.5,
    });
    expect(r.reasons).toContain('short bio');
  });

  it('healthScore always in [0, 1]', () => {
    const many: ProfileHealthInput[] = [];
    for (let ph = 0; ph <= 6; ph++)
      for (const g of [0, 0.5, 1])
        for (const r of [0, 0.5, 1])
          many.push({ photoCount: ph, bioLengthChars: 50, promptCount: 1, verified: false, responseRate: r, ghostRate: g, daysSinceLastActive: 10 });
    for (const inp of many) {
      const s = scoreProfileHealth(inp).healthScore;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('deterministic', () => {
    const a = scoreProfileHealth(base);
    const b = scoreProfileHealth(base);
    expect(a).toEqual(b);
  });
});
