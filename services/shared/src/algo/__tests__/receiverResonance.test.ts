import { describe, it, expect } from 'vitest';
import {
  buildResonance,
  NEUTRAL_RESONANCE,
  SUCCESS_REPLY_MS,
  COLD_START_THRESHOLD,
  RESONANCE_WINDOW,
  type FirstMoveOutcomeSample,
  type OpenerKind,
  type ResonanceTone,
} from '../v8/moveV2/receiverResonance';

function mk(kind: OpenerKind, tone: ResonanceTone, replied = true, replyMs: number | null = 60_000, len = 30): FirstMoveOutcomeSample {
  return { openerKind: kind, tone, replied, replyMs, openerLengthChars: len };
}

describe('buildResonance — cold start', () => {
  it('returns neutral for empty input with no archetype', () => {
    const v = buildResonance([]);
    expect(v.sampleCount).toBe(0);
    expect(v.confidence).toBe(0);
    expect(v.kindDistribution).toEqual(NEUTRAL_RESONANCE.kindDistribution);
  });

  it('cold-start with archetype=wordsmith biases to specific_detail/question/shared_interest', () => {
    const v = buildResonance([], { archetype: 'wordsmith' });
    expect(v.kindDistribution.specific_detail).toBeGreaterThan(0.5);
    expect(v.kindDistribution.question).toBeGreaterThan(0);
    expect(v.kindDistribution.shared_interest).toBeGreaterThan(0);
  });

  it('cold-start with archetype=voice_first biases to voice_invite', () => {
    const v = buildResonance([], { archetype: 'voice_first' });
    expect(v.kindDistribution.voice_invite).toBeGreaterThan(0.5);
  });

  it('cold-start with archetype=visual biases to photo_invite', () => {
    const v = buildResonance([], { archetype: 'visual' });
    expect(v.kindDistribution.photo_invite).toBeGreaterThan(0.5);
  });

  it('cold-start with archetype=fast_replier biases to playful', () => {
    const v = buildResonance([], { archetype: 'fast_replier' });
    expect(v.kindDistribution.playful).toBeGreaterThan(0.5);
  });

  it('cold-start tone distribution biases to archetype primary tone', () => {
    const v = buildResonance([], { archetype: 'wordsmith' });
    expect(v.toneDistribution.reflective).toBeCloseTo(0.7, 5);
  });

  it('1 successful reply still triggers cold-start (below COLD_START_THRESHOLD)', () => {
    const v = buildResonance([mk('question', 'casual')], { archetype: 'fast_replier' });
    expect(v.sampleCount).toBe(1);
    expect(v.kindDistribution.playful).toBeGreaterThan(0.5);
  });
});

describe('buildResonance — full distribution', () => {
  it('10 question replies → kindDistribution.question ≈ 1.0', () => {
    const samples = Array.from({ length: 10 }, () => mk('question', 'casual'));
    const v = buildResonance(samples);
    expect(v.kindDistribution.question).toBeCloseTo(1, 5);
    expect(v.confidence).toBe(1);
  });

  it('5 question + 5 playful → roughly 50/50', () => {
    const samples = [
      ...Array.from({ length: 5 }, () => mk('question', 'casual')),
      ...Array.from({ length: 5 }, () => mk('playful', 'quick')),
    ];
    const v = buildResonance(samples);
    expect(v.kindDistribution.question).toBeCloseTo(0.5, 5);
    expect(v.kindDistribution.playful).toBeCloseTo(0.5, 5);
  });

  it('tone distribution matches input counts', () => {
    const samples = Array.from({ length: 10 }, () => mk('question', 'reflective'));
    const v = buildResonance(samples);
    expect(v.toneDistribution.reflective).toBeCloseTo(1, 5);
  });

  it('preferredLengthMedian reflects observed lengths', () => {
    const samples = Array.from({ length: 10 }, (_, i) => mk('question', 'casual', true, 60_000, 50));
    const v = buildResonance(samples);
    expect(v.preferredLengthMedian).toBe(50);
  });
});

describe('buildResonance — filtering', () => {
  it('filters out unreplied outcomes', () => {
    const samples: FirstMoveOutcomeSample[] = [
      ...Array.from({ length: 5 }, () => mk('question', 'casual', false, null)),
      ...Array.from({ length: 5 }, () => mk('playful', 'quick', true, 60_000)),
    ];
    const v = buildResonance(samples);
    expect(v.kindDistribution.playful).toBeCloseTo(1, 5);
  });

  it('filters out replies slower than SUCCESS_REPLY_MS', () => {
    const samples = [
      ...Array.from({ length: 5 }, () => mk('question', 'casual', true, SUCCESS_REPLY_MS + 1)),
      ...Array.from({ length: 5 }, () => mk('playful', 'quick', true, 60_000)),
    ];
    const v = buildResonance(samples);
    expect(v.kindDistribution.playful).toBeCloseTo(1, 5);
  });

  it('clips to RESONANCE_WINDOW most recent', () => {
    const samples = Array.from({ length: RESONANCE_WINDOW + 5 }, () => mk('question', 'casual'));
    const v = buildResonance(samples);
    expect(v.sampleCount).toBe(RESONANCE_WINDOW);
  });

  it('confidence scales with sample count', () => {
    const v3 = buildResonance(Array.from({ length: COLD_START_THRESHOLD }, () => mk('question', 'casual')));
    expect(v3.confidence).toBeCloseTo(COLD_START_THRESHOLD / RESONANCE_WINDOW, 5);
  });
});
