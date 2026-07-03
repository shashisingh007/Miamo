/**
 * Unit tests — text moderation client.
 *
 * Covers `DefaultTextModerator`:
 *   - empty / trivial approval
 *   - tier-1 slur → hard block (racial, casteist, homophobic, ableist)
 *   - tier-2 slur → soft block
 *   - leetspeak normalisation (n1gger, n!gger, NIGGER)
 *   - Hindi + Tamil transliterated slurs
 *   - false-positive avoidance (Scunthorpe / assassin / assumption)
 *   - CSAM-adjacent token escalation
 *   - doxxing (phone + email + insta/whatsapp)
 *   - spam heuristics (repetition + all-caps)
 *
 * Cross-ref:
 *   - services/shared/src/moderation/textModerationClient.ts
 *   - docs/architecture/moderation-pipeline.md
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.11
 */

import { describe, it, expect } from 'vitest';
import { DefaultTextModerator, _internal } from '../../services/shared/src/moderation/textModerationClient';

const mod = new DefaultTextModerator();

describe('DefaultTextModerator — approval path', () => {
  it('approves empty string', async () => {
    const d = await mod.moderateText('');
    expect(d.approved).toBe(true);
  });

  it('approves whitespace-only', async () => {
    const d = await mod.moderateText('    \t\n  ');
    expect(d.approved).toBe(true);
  });

  it('approves a normal message', async () => {
    const d = await mod.moderateText('Hi there — what did you think of that trail on Sunday?');
    expect(d.approved).toBe(true);
    expect(d.categories).toEqual([]);
  });

  it('approves benign English words that superficially resemble slurs (Scunthorpe problem)', async () => {
    // The tokeniser splits on whitespace and matches whole tokens, so
    // substring hits inside a longer word must not fire.
    for (const s of ['Scunthorpe', 'assumption', 'classified', 'assassination', 'passenger']) {
      const d = await mod.moderateText(s);
      expect(d.approved, `${s} should approve`).toBe(true);
    }
  });
});

describe('DefaultTextModerator — tier-1 slurs (hard block)', () => {
  it('hard-blocks the n-word', async () => {
    const d = await mod.moderateText('You are a nigger');
    expect(d.approved).toBe(false);
    expect(d.severity).toBe('hard');
    expect(d.categories).toContain('slur');
  });

  it('hard-blocks leetspeak variants (n1gger, n!gger, N!GGER)', async () => {
    for (const s of ['n1gger', 'n!gger', 'N!GGER']) {
      const d = await mod.moderateText(`u r a ${s}`);
      expect(d.approved, s).toBe(false);
      expect(d.severity, s).toBe('hard');
    }
  });

  it('hard-blocks a homophobic slur mid-sentence', async () => {
    const d = await mod.moderateText('Do not be such a faggot');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('slur');
  });

  it('hard-blocks a Hindi-transliterated casteist slur (bhangi)', async () => {
    const d = await mod.moderateText('You bhangi go away');
    expect(d.approved).toBe(false);
    expect(d.severity).toBe('hard');
  });

  it('hard-blocks another Hindi transliteration (chamar)', async () => {
    const d = await mod.moderateText('Kaisa chamar bola');
    expect(d.approved).toBe(false);
  });

  it('hard-blocks a Tamil transliteration (paraiyan)', async () => {
    const d = await mod.moderateText('You paraiyan');
    expect(d.approved).toBe(false);
  });

  it('hard-blocks a Hindi misogynist slur (randi)', async () => {
    const d = await mod.moderateText('kya randi hai tu');
    expect(d.approved).toBe(false);
    expect(d.severity).toBe('hard');
  });

  it('escalates CSAM-adjacent tokens to `csam` category rather than `slur`', async () => {
    const d = await mod.moderateText('looking for lolita content');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('csam');
    expect(d.severity).toBe('hard');
  });
});

describe('DefaultTextModerator — tier-2 slurs (soft block)', () => {
  it('soft-blocks mild English insult (idiot)', async () => {
    const d = await mod.moderateText('what an idiot');
    expect(d.approved).toBe(false);
    expect(d.severity).toBe('soft');
    expect(d.categories).toContain('slur');
  });

  it('soft-blocks Hindi-transliterated mild insult (kutta)', async () => {
    const d = await mod.moderateText('tu kutta hai');
    expect(d.approved).toBe(false);
    expect(d.severity).toBe('soft');
  });

  it('does NOT block reclaimed context that is not a slur token', async () => {
    // We match whole tokens only. "Hot dog food" has no slur token.
    const d = await mod.moderateText('Hot dog food is great');
    expect(d.approved).toBe(true);
  });
});

describe('DefaultTextModerator — doxxing', () => {
  it('soft-blocks a bare Indian phone number', async () => {
    const d = await mod.moderateText('call me on 9876543210 please');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('doxxing');
    expect(d.severity).toBe('soft');
  });

  it('soft-blocks phone number with +91', async () => {
    const d = await mod.moderateText('WhatsApp: +91 9876543210');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('doxxing');
  });

  it('soft-blocks an email address', async () => {
    const d = await mod.moderateText('mail me at bob@example.com');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('doxxing');
  });

  it('soft-blocks whatsapp handle solicitation', async () => {
    const d = await mod.moderateText('whatsapp me plz');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('doxxing');
  });

  it('soft-blocks insta handle solicitation', async () => {
    const d = await mod.moderateText('drop your insta handle');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('doxxing');
  });

  it('approves the word "insta" in a non-solicitation context', async () => {
    // We require the pattern "insta handle" / "insta dm" / "insta id".
    const d = await mod.moderateText('I love instant noodles');
    expect(d.approved).toBe(true);
  });
});

describe('DefaultTextModerator — spam heuristics', () => {
  it('flags repeated-character spam', async () => {
    const d = await mod.moderateText('aaaaaaaaaaaaa');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('spam');
  });

  it('flags all-caps shouting over 60 chars', async () => {
    const d = await mod.moderateText('BUY MY PRODUCT NOW GO TO THIS LINK IMMEDIATELY OR YOU WILL REGRET IT');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('spam');
  });

  it('flags repeated-word spam', async () => {
    const d = await mod.moderateText('buy buy buy buy buy');
    expect(d.approved).toBe(false);
    expect(d.categories).toContain('spam');
  });

  it('does NOT flag short all-caps ("OK", "LOL")', async () => {
    for (const s of ['OK', 'LOL', 'YAY', 'HAHA']) {
      const d = await mod.moderateText(s);
      expect(d.approved, s).toBe(true);
    }
  });
});

describe('DefaultTextModerator — internals sanity', () => {
  it('normalises case + strips punctuation + folds leetspeak', () => {
    expect(_internal.normalize('N!GG3R!!')).toContain('nigger');
    // Punctuation collapses to whitespace; multiple spaces collapse to one.
    // `!` → `i` is a deliberate leetspeak fold (see textModerationClient §normalize).
    expect(_internal.normalize('   Hello,   World  ')).toBe('hello world');
  });

  it('exposes tier-1 + tier-2 slur lists as readonly arrays', () => {
    expect(_internal.TIER_1_SLURS.length).toBeGreaterThan(10);
    expect(_internal.TIER_2_SLURS.length).toBeGreaterThan(5);
  });

  it('total slur coverage crosses 25 entries (English + Hindi + Tamil transliterations)', () => {
    const total = _internal.TIER_1_SLURS.length + _internal.TIER_2_SLURS.length;
    expect(total).toBeGreaterThanOrEqual(25);
  });
});
