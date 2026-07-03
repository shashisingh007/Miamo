import { describe, it, expect } from 'vitest';
import { classifyMove } from '../moveProfile';

describe('classifyMove', () => {
  it('returns wordsmith for long-text-first users', () => {
    const c = classifyMove({
      avgMoveLenChars: 250, voiceShare: 0.05, mediaShare: 0.05,
      p50ReplyMinutes: 30, totalMessages: 100,
    });
    expect(c.archetype).toBe('wordsmith');
  });

  it('returns voice_first for heavy voice users with fast replies', () => {
    const c = classifyMove({
      avgMoveLenChars: 50, voiceShare: 0.6, mediaShare: 0.1,
      p50ReplyMinutes: 1, totalMessages: 80,
    });
    expect(c.archetype).toBe('voice_first');
  });

  it('returns visual for heavy media share', () => {
    const c = classifyMove({
      avgMoveLenChars: 40, voiceShare: 0.05, mediaShare: 0.7,
      p50ReplyMinutes: 10, totalMessages: 60,
    });
    expect(c.archetype).toBe('visual');
  });

  it('returns fast_replier for short fast messages', () => {
    const c = classifyMove({
      avgMoveLenChars: 30, voiceShare: 0.05, mediaShare: 0.05,
      p50ReplyMinutes: 1, totalMessages: 120,
    });
    expect(c.archetype).toBe('fast_replier');
  });

  it('probs always sum to ~1', () => {
    const c = classifyMove({
      avgMoveLenChars: 100, voiceShare: 0.3, mediaShare: 0.2,
      p50ReplyMinutes: 5, totalMessages: 40,
    });
    const sum = c.probs.wordsmith + c.probs.voice_first + c.probs.visual + c.probs.fast_replier;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('low totalMessages yields low confidence', () => {
    const c = classifyMove({
      avgMoveLenChars: 100, voiceShare: 0.3, mediaShare: 0.2,
      p50ReplyMinutes: 5, totalMessages: 3,
    });
    expect(c.confidence).toBeLessThan(0.4);
  });

  it('high totalMessages + peaked dist yields high confidence', () => {
    const c = classifyMove({
      avgMoveLenChars: 250, voiceShare: 0.02, mediaShare: 0.02,
      p50ReplyMinutes: 30, totalMessages: 100,
    });
    expect(c.confidence).toBeGreaterThan(0.5);
  });

  it('handles zero-message edge case without NaN', () => {
    const c = classifyMove({
      avgMoveLenChars: 0, voiceShare: 0, mediaShare: 0,
      p50ReplyMinutes: 0, totalMessages: 0,
    });
    const sum = c.probs.wordsmith + c.probs.voice_first + c.probs.visual + c.probs.fast_replier;
    expect(sum).toBeCloseTo(1, 5);
    expect(Number.isFinite(c.confidence)).toBe(true);
  });
});
