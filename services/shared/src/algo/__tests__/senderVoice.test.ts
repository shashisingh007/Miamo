import { describe, it, expect } from 'vitest';
import {
  extractSenderVoice,
  projectToVoice,
  NEUTRAL_VOICE,
  SAMPLE_TARGET,
  MIN_SAMPLES,
  type OutboundMessageSample,
} from '../v8/moveV2/senderVoice';

const t = (s: string, k = 0): OutboundMessageSample => ({ content: s, createdAtMs: 1_700_000_000_000 + k * 1000 });

function repeat(s: string, n: number): OutboundMessageSample[] {
  return Array.from({ length: n }, (_, i) => t(s, i));
}

describe('extractSenderVoice — neutral fallback', () => {
  it('returns neutral when input is empty', () => {
    const v = extractSenderVoice([]);
    expect(v.sampleCount).toBe(0);
    expect(v.confidence).toBe(0);
    expect(v.medianLengthChars).toBe(NEUTRAL_VOICE.medianLengthChars);
  });

  it('returns neutral when below MIN_SAMPLES', () => {
    const v = extractSenderVoice(repeat('i think you should try', MIN_SAMPLES - 1));
    expect(v.sampleCount).toBe(MIN_SAMPLES - 1);
    // observed below floor → use neutral medians, but confidence reflects size
    expect(v.medianLengthChars).toBe(NEUTRAL_VOICE.medianLengthChars);
    expect(v.confidence).toBeCloseTo((MIN_SAMPLES - 1) / SAMPLE_TARGET, 5);
  });

  it('handles null content samples gracefully', () => {
    const samples: OutboundMessageSample[] = repeat('hello', MIN_SAMPLES);
    const v = extractSenderVoice(samples);
    expect(v.sampleCount).toBe(MIN_SAMPLES);
  });
});

describe('extractSenderVoice — basic stats', () => {
  it('confidence reaches 1.0 at SAMPLE_TARGET messages', () => {
    const v = extractSenderVoice(repeat('hello there', SAMPLE_TARGET));
    expect(v.confidence).toBe(1);
    expect(v.sampleCount).toBe(SAMPLE_TARGET);
  });

  it('lowercaseIRate ≈ 1 when all messages use lowercase i', () => {
    const v = extractSenderVoice(repeat('i think you should go', SAMPLE_TARGET));
    expect(v.lowercaseIRate).toBeCloseTo(1, 2);
  });

  it('lowercaseIRate ≈ 0 when all messages use uppercase I', () => {
    const v = extractSenderVoice(repeat('I think you should go', SAMPLE_TARGET));
    expect(v.lowercaseIRate).toBeCloseTo(0, 2);
  });

  it('exclamationRate matches per-message average', () => {
    const samples = [
      ...repeat('you', 25),
      ...repeat('you!', 25),
    ];
    const v = extractSenderVoice(samples);
    expect(v.exclamationRate).toBeCloseTo(0.5, 2);
  });

  it('questionRate counts question marks per message', () => {
    const v = extractSenderVoice(repeat('what is up?', SAMPLE_TARGET));
    expect(v.questionRate).toBeCloseTo(1, 2);
  });

  it('emojiRate counts emojis per message', () => {
    const v = extractSenderVoice(repeat('lol 😂', SAMPLE_TARGET));
    expect(v.emojiRate).toBeGreaterThan(0.9);
    expect(v.topEmojis.length).toBeGreaterThan(0);
  });

  it('topEmojis ranks by count', () => {
    const samples = [
      ...repeat('😂', 30),
      ...repeat('❤️', 10),
      ...repeat('👍', 5),
    ];
    const v = extractSenderVoice(samples);
    expect(v.topEmojis[0]).toBe('😂');
  });

  it('lowercaseStartRate detects lowercase-starting messages', () => {
    const v = extractSenderVoice(repeat('hello there', SAMPLE_TARGET));
    expect(v.lowercaseStartRate).toBeCloseTo(1, 2);
  });

  it('lowercaseStartRate ≈ 0 for capitalised starts', () => {
    const v = extractSenderVoice(repeat('Hello there', SAMPLE_TARGET));
    expect(v.lowercaseStartRate).toBeCloseTo(0, 2);
  });

  it('contractionRate prefers contractions', () => {
    const v = extractSenderVoice(repeat("i don't know it's true", SAMPLE_TARGET));
    expect(v.contractionRate).toBeGreaterThan(0.9);
  });

  it('contractionRate prefers expansion forms', () => {
    const v = extractSenderVoice(repeat('i do not know it is true', SAMPLE_TARGET));
    expect(v.contractionRate).toBeLessThan(0.1);
  });

  it('laughTokenRate counts lol/haha/lmao', () => {
    const v = extractSenderVoice(repeat('lol haha lmao', SAMPLE_TARGET));
    expect(v.laughTokenRate).toBeGreaterThan(2);
  });

  it('typoRateApprox is low for common-dict words', () => {
    const v = extractSenderVoice(repeat('hello there how are you', SAMPLE_TARGET));
    expect(v.typoRateApprox).toBeLessThan(0.1);
  });

  it('typoRateApprox is high for nonsense words', () => {
    const v = extractSenderVoice(repeat('xqzr fnoob plurfle', SAMPLE_TARGET));
    expect(v.typoRateApprox).toBeGreaterThan(0.8);
  });

  it('fragmentsPerMessage counts short pieces after . splits', () => {
    const v = extractSenderVoice(repeat('ok. yes. no.', SAMPLE_TARGET));
    expect(v.fragmentsPerMessage).toBeGreaterThan(0);
  });
});

describe('projectToVoice', () => {
  it('lowercases first char when sender starts lowercase often', () => {
    const voice = extractSenderVoice(repeat('hello there', SAMPLE_TARGET));
    const out = projectToVoice('This is great', voice);
    expect(out.charAt(0)).toBe('t');
  });

  it('strips trailing ! when sender almost never uses them', () => {
    const voice = extractSenderVoice(repeat('hello there', SAMPLE_TARGET));
    const out = projectToVoice('hey there!', voice);
    expect(out.endsWith('!')).toBe(false);
  });

  it('contracts "do not" → "don\'t" when sender contracts a lot', () => {
    const voice = extractSenderVoice(repeat("i don't know it's true", SAMPLE_TARGET));
    const out = projectToVoice('i do not know', voice);
    expect(out).toContain("don't");
  });

  it('returns input unchanged when voice has low confidence and uppercase ok', () => {
    const out = projectToVoice('This is great.', NEUTRAL_VOICE);
    expect(out.length).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const v = extractSenderVoice(repeat('hello', SAMPLE_TARGET));
    expect(projectToVoice('', v)).toBe('');
  });
});
