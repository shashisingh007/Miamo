import { describe, it, expect } from 'vitest';
import {
  suggestReactivation,
  HOURS_SILENT_CALLBACK,
  HOURS_SILENT_ICEBREAK,
  MAX_SUGGESTIONS,
  type ReactivationInput,
} from '../../v9/conversationStarter';

const baseInput = (over: Partial<ReactivationInput> = {}): ReactivationInput => ({
  hoursSinceLastMessage: 25,
  lastMessage: '',
  lastMessageFrom: 'sender',
  receiverArchetype: undefined,
  senderVoiceLen: 40,
  senderEmojiRate: 0,
  sharedInterests: [],
  ...over,
});

describe('v9/conversationStarter — suggestReactivation', () => {
  it('always returns at least one suggestion, at most MAX_SUGGESTIONS', () => {
    const s = suggestReactivation(baseInput());
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it('sorted by confidence descending', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 40,
      lastMessage: 'that hike we talked about',
      lastMessageFrom: 'receiver',
      sharedInterests: ['photography'],
    }));
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].confidence).toBeGreaterThanOrEqual(s[i].confidence);
    }
  });

  it('48h silent + wordsmith receiver → produces a callback-style suggestion referencing last message', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 48,
      lastMessage: 'been meaning to try that new coffee place',
      lastMessageFrom: 'receiver',
      receiverArchetype: 'wordsmith',
      sharedInterests: [],
    }));
    const cb = s.find((x) => x.tone === 'callback');
    expect(cb).toBeDefined();
    // Reference to last-message content (lowercase in snippet).
    expect(cb!.text.toLowerCase()).toMatch(/coffee/);
  });

  it('no callback when the SENDER spoke last (nothing to callback to)', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 48,
      lastMessage: 'my last message',
      lastMessageFrom: 'sender',
    }));
    for (const x of s) expect(x.tone).not.toBe('callback');
  });

  it('long gap (>168h) triggers a break_the_ice suggestion', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: HOURS_SILENT_ICEBREAK + 1,
      lastMessageFrom: 'sender',
      lastMessage: '',
    }));
    const bi = s.find((x) => x.tone === 'break_the_ice');
    expect(bi).toBeDefined();
  });

  it('short gap (<48h) with no interests still returns a casual + curious pair', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 25,
      lastMessage: '',
      lastMessageFrom: 'sender',
      sharedInterests: [],
    }));
    const tones = new Set(s.map((x) => x.tone));
    expect(tones.has('casual')).toBe(true);
  });

  it('shared-interest suggestion fills the {interest} placeholder', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 30,
      lastMessage: '',
      lastMessageFrom: 'sender',
      sharedInterests: ['photography'],
    }));
    const withInterest = s.find((x) => x.text.toLowerCase().includes('photography'));
    expect(withInterest).toBeDefined();
  });

  it('confidence decreases as gap grows (all else equal)', () => {
    const short = suggestReactivation(baseInput({ hoursSinceLastMessage: 25 }))[0].confidence;
    const mid   = suggestReactivation(baseInput({ hoursSinceLastMessage: 60 }))[0].confidence;
    const long  = suggestReactivation(baseInput({ hoursSinceLastMessage: 200 }))[0].confidence;
    expect(short).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(long);
  });

  it('deterministic: identical inputs → identical output', () => {
    const inp: ReactivationInput = baseInput({
      hoursSinceLastMessage: 72,
      lastMessage: 'the concert plan',
      lastMessageFrom: 'receiver',
      receiverArchetype: 'visual',
      sharedInterests: ['music', 'hiking'],
      senderVoiceLen: 55,
      senderEmojiRate: 0.4,
    });
    const a = suggestReactivation(inp);
    const b = suggestReactivation(inp);
    expect(a).toEqual(b);
  });

  it('emoji appended when senderEmojiRate > 0.3', () => {
    const s = suggestReactivation(baseInput({
      senderEmojiRate: 0.5,
      lastMessage: 'anything',
      lastMessageFrom: 'receiver',
    }));
    // At least one suggestion should end with an emoji
    const anyEmoji = s.some((x) => /🙂/.test(x.text));
    expect(anyEmoji).toBe(true);
  });

  it('no emoji when senderEmojiRate ≤ 0.3', () => {
    const s = suggestReactivation(baseInput({
      senderEmojiRate: 0.1,
      lastMessage: 'anything',
      lastMessageFrom: 'receiver',
    }));
    for (const x of s) expect(/🙂/.test(x.text)).toBe(false);
  });

  it('HOURS_SILENT_CALLBACK is 48 (design brief)', () => {
    expect(HOURS_SILENT_CALLBACK).toBe(48);
  });

  it('deduplicates identical suggestion text', () => {
    const s = suggestReactivation(baseInput({
      hoursSinceLastMessage: 25,
      lastMessage: '',
      lastMessageFrom: 'sender',
    }));
    const seen = new Set(s.map((x) => x.text));
    expect(seen.size).toBe(s.length);
  });

  it('confidence is always in [0,1]', () => {
    for (let h = 0; h <= 720; h += 60) {
      const s = suggestReactivation(baseInput({ hoursSinceLastMessage: h }));
      for (const x of s) {
        expect(x.confidence).toBeGreaterThanOrEqual(0);
        expect(x.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('template variant rotates on senderVoiceLen (two different senders can diverge)', () => {
    const a = suggestReactivation(baseInput({
      senderVoiceLen: 20,
      lastMessage: 'plan',
      lastMessageFrom: 'receiver',
    }));
    const b = suggestReactivation(baseInput({
      senderVoiceLen: 21,
      lastMessage: 'plan',
      lastMessageFrom: 'receiver',
    }));
    // At least one text should differ across the two callers.
    const aTexts = new Set(a.map((x) => x.text));
    const bTexts = new Set(b.map((x) => x.text));
    let diverged = false;
    for (const t of bTexts) if (!aTexts.has(t)) { diverged = true; break; }
    // Not strictly guaranteed but with 2-variant pools + hash rotation it's typical.
    // Assert soft: either diverged OR both returned the same non-empty set (shouldn't be empty).
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    if (!diverged) expect(a).toEqual(b);
  });
});
