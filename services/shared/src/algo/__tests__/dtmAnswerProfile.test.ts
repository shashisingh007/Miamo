import { describe, it, expect } from 'vitest';
import { classifyDtmAnswerer, type DtmAnswerStats } from '../dtmAnswerProfile';

const base: DtmAnswerStats = {
  totalAnswered: 40, totalStarted: 40, p50AnswerMs: 14000,
  revisitRate: 0.1, topicsCovered: 8, sessionCount: 3,
};

describe('classifyDtmAnswerer', () => {
  it('returns a deterministic archetype', () => {
    const a = classifyDtmAnswerer(base);
    const b = classifyDtmAnswerer(base);
    expect(a.archetype).toBe(b.archetype);
    expect(a.probs).toEqual(b.probs);
  });

  it('probs sum to ~1.0', () => {
    const r = classifyDtmAnswerer(base);
    const sum = Object.values(r.probs).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('classifies fast / no-revisit / completed answerers as decisive', () => {
    const r = classifyDtmAnswerer({
      ...base, p50AnswerMs: 4_000, revisitRate: 0, totalAnswered: 30, totalStarted: 30,
    });
    expect(r.archetype).toBe('decisive');
  });

  it('classifies high-revisit medium-time as exploratory', () => {
    const r = classifyDtmAnswerer({
      ...base, p50AnswerMs: 12_000, revisitRate: 0.6, topicsCovered: 14,
    });
    expect(r.archetype).toBe('exploratory');
  });

  it('classifies slow + abandons as skeptical', () => {
    const r = classifyDtmAnswerer({
      ...base, p50AnswerMs: 26_000, totalAnswered: 5, totalStarted: 25,
    });
    expect(r.archetype).toBe('skeptical');
  });

  it('classifies many-sessions + high-completion as completionist', () => {
    const r = classifyDtmAnswerer({
      ...base, sessionCount: 6, totalAnswered: 60, totalStarted: 60, p50AnswerMs: 14_000,
    });
    expect(r.archetype).toBe('completionist');
  });

  it('falls back to uniform probs when all signals are zero', () => {
    const r = classifyDtmAnswerer({
      totalAnswered: 0, totalStarted: 0, p50AnswerMs: 0,
      revisitRate: 0, topicsCovered: 0, sessionCount: 0,
    });
    for (const p of Object.values(r.probs)) expect(p).toBeCloseTo(0.25, 6);
  });

  it('confidence scales with sample size', () => {
    const small = classifyDtmAnswerer({ ...base, totalAnswered: 2, totalStarted: 2 });
    const big   = classifyDtmAnswerer({ ...base, totalAnswered: 80, totalStarted: 80 });
    expect(big.confidence).toBeGreaterThan(small.confidence);
  });

  it('confidence stays in [0, 1]', () => {
    const r = classifyDtmAnswerer(base);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
