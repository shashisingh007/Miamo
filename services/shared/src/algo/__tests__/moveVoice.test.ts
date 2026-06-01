import { describe, it, expect } from 'vitest';
import {
  renderMove,
  lintMove,
  toneFromArchetype,
  FORBIDDEN_TONES,
  MAX_LEN,
  type MoveTone,
} from '../moveVoice';

const tones: MoveTone[] = ['reflective', 'casual', 'tactile', 'quick'];

describe('moveVoice.lintMove', () => {
  it('passes a clean human line', () => {
    expect(lintMove('say hey, alex likes filter coffee too').ok).toBe(true);
  });

  it('rejects empty', () => {
    expect(lintMove('').ok).toBe(false);
  });

  it('rejects over-length', () => {
    const long = 'a'.repeat(MAX_LEN + 1);
    expect(lintMove(long).ok).toBe(false);
  });

  it.each([
    'I noticed you like coffee',
    'Based on your activity, try this',
    'As per the data, hello',
    'It seems you might enjoy this',
    'You might want to try a coffee',
    'Consider sending a message',
    'we recommend coffee',
    'miamo suggests you reach out',
    'as an AI I think coffee',
    'feel free to chat',
    'kindly send a message',
    'this is the optimal move',
    'let us leverage this hook',
    'send a note — about coffee',
    'AI thinks you should try this',
    'Hey!',
    'Maybe try??',
  ])('rejects forbidden phrase: %s', (line) => {
    expect(lintMove(line).ok).toBe(false);
  });

  it('every FORBIDDEN_TONES entry is a string or RegExp', () => {
    for (const t of FORBIDDEN_TONES) {
      expect(typeof t === 'string' || t instanceof RegExp).toBe(true);
    }
  });
});

describe('moveVoice.renderMove', () => {
  it.each(tones)('renders a clean line for tone: %s', (tone) => {
    const r = renderMove({ tone, ctx: { name: 'sam', hook: 'filter coffee' }, seed: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.line.length).toBeLessThanOrEqual(MAX_LEN);
      expect(lintMove(r.line).ok).toBe(true);
    }
  });

  it('handles missing name gracefully', () => {
    const r = renderMove({ tone: 'casual', ctx: { hook: 'indie sci-fi' }, seed: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.line).not.toContain('{NAME}');
  });

  it('handles missing hook gracefully', () => {
    const r = renderMove({ tone: 'casual', ctx: { name: 'sam' }, seed: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.line).not.toContain('{HOOK}');
  });

  it('handles missing hook2 by reusing hook', () => {
    const r = renderMove({ tone: 'quick', ctx: { name: 'sam', hook: 'tea' }, seed: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.line).not.toContain('{HOOK2}');
  });

  it('seeded render is stable across calls', () => {
    const a = renderMove({ tone: 'reflective', ctx: { name: 'sam', hook: 'sci-fi' }, seed: 42 });
    const b = renderMove({ tone: 'reflective', ctx: { name: 'sam', hook: 'sci-fi' }, seed: 42 });
    expect(a).toEqual(b);
  });

  it('different seeds vary the template', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 8; s++) {
      const r = renderMove({ tone: 'casual', ctx: { name: 'a', hook: 'b' }, seed: s });
      if (r.ok) seen.add(r.line);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('1000 random renders produce zero forbidden lines (linter contract)', () => {
    const hooks = ['filter coffee', 'indie sci-fi', 'late-night drives', 'matcha', 'lo-fi', 'sourdough', 'thrifting', 'climbing'];
    const names = ['sam', 'alex', 'rae', 'jules', 'mo', 'kai', 'noor', 'ari'];
    let failures = 0;
    for (let i = 0; i < 1000; i++) {
      const tone = tones[i % tones.length];
      const name = names[i % names.length];
      const hook = hooks[(i * 3) % hooks.length];
      const hook2 = hooks[(i * 5) % hooks.length];
      const r = renderMove({ tone, ctx: { name, hook, hook2 }, seed: i });
      if (!r.ok) {
        failures++;
      } else if (!lintMove(r.line).ok) {
        failures++;
      }
    }
    expect(failures).toBe(0);
  });

  it('all rendered lines respect length cap', () => {
    for (let i = 0; i < 200; i++) {
      const tone = tones[i % tones.length];
      const r = renderMove({
        tone,
        ctx: { name: 'samantha', hook: 'extremely long shared interest token here', hook2: 'another long hook' },
        seed: i,
      });
      // lengthy hooks may push past cap; renderer should fail rather than emit
      if (r.ok) expect(r.line.length).toBeLessThanOrEqual(MAX_LEN);
    }
  });
});

describe('moveVoice.toneFromArchetype', () => {
  it('maps known archetypes', () => {
    expect(toneFromArchetype('wordsmith')).toBe('reflective');
    expect(toneFromArchetype('voice_first')).toBe('casual');
    expect(toneFromArchetype('visual')).toBe('tactile');
    expect(toneFromArchetype('fast_replier')).toBe('quick');
  });

  it('falls back to casual for unknown', () => {
    expect(toneFromArchetype('nope')).toBe('casual');
    expect(toneFromArchetype('')).toBe('casual');
  });
});
