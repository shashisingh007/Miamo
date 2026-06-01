/**
 * Move voice — V7 phase H.
 *
 * Pure templater for *Miamo Move* suggestions. Renders a single line ≤ 90
 * chars that should sound like a thoughtful friend, **never** like an AI
 * product surface.
 *
 * The render path is intentionally tiny: pick a template by tone, fill
 * placeholders, run the linter. The linter is the contract — if a tone
 * matrix change ever leaks an "AI smell" phrase, tests fail loudly.
 */

export type MoveTone = 'reflective' | 'casual' | 'tactile' | 'quick';

export type MoveContext = {
  /** Optional name. May be "" — templates handle missing cleanly. */
  name?: string;
  /** Concrete shared-interest token, e.g. "filter coffee", "indie sci-fi". */
  hook?: string;
  /** Optional second hook for variety. */
  hook2?: string;
  /** Optional locale-friendly verb like "vibe", "go", "try". */
  verb?: string;
};

/**
 * Phrases or patterns that betray AI / corporate voice. The linter rejects
 * any rendered Move that contains one. Match is case-insensitive substring
 * unless the entry is a RegExp.
 */
export const FORBIDDEN_TONES: ReadonlyArray<string | RegExp> = [
  'i noticed',
  'based on',
  'as per',
  'it seems',
  'you might want to',
  'consider ',
  'we recommend',
  'miamo suggests',
  'miamo recommends',
  'as an ai',
  'i think you',
  'in my opinion',
  'feel free to',
  'kindly',
  'optimal',
  'leverag',         // "leverage", "leveraging"
  '—',               // em-dash, too formal
  /\bai\b/i,         // standalone "ai"
  /!{1}/,            // any exclamation mark — keep it cool
  /\?{2,}/,          // double question marks
];

export const MAX_LEN = 90;

const TEMPLATES: Record<MoveTone, readonly string[]> = {
  reflective: [
    "tiny thought: ask {NAME} what {HOOK} means to them",
    "low-key — {NAME} mentioned {HOOK}, what pulled them in",
    "if it lands: which {HOOK} memory still sits with {NAME}",
    "soft one — {NAME}'s take on {HOOK} probably has a story",
  ],
  casual: [
    "say hey, {NAME} likes {HOOK} too — open with that",
    "drop a voice note about {HOOK}, {NAME} will reply",
    "easy one: {HOOK}? yes or no for {NAME}",
    "send {NAME} the thing about {HOOK} you've been sitting on",
  ],
  tactile: [
    "pic of {HOOK} you took recently → {NAME} will get it",
    "screenshot the {HOOK} bit from your camera roll for {NAME}",
    "show {NAME} your {HOOK} corner, no caption needed",
  ],
  quick: [
    "two words to {NAME}: {HOOK}?",
    "ping {NAME}: {HOOK} or {HOOK2}",
    "{HOOK}? — to {NAME}, before you overthink",
    "send {NAME} a one-liner about {HOOK}",
  ],
};

function pickTemplate(tone: MoveTone, seed: number): string {
  const list = TEMPLATES[tone];
  const idx = Math.abs(Math.floor(seed)) % list.length;
  return list[idx];
}

function fill(template: string, ctx: MoveContext): string {
  const name = (ctx.name ?? '').trim() || 'them';
  const hook = (ctx.hook ?? '').trim() || 'that thing';
  const hook2 = (ctx.hook2 ?? '').trim() || hook;
  return template
    .replace(/\{NAME\}/g, name)
    .replace(/\{HOOK2\}/g, hook2)
    .replace(/\{HOOK\}/g, hook);
}

export function lintMove(line: string): { ok: boolean; reason?: string } {
  if (!line) return { ok: false, reason: 'empty' };
  if (line.length > MAX_LEN) return { ok: false, reason: 'too_long' };
  const lower = line.toLowerCase();
  for (const pat of FORBIDDEN_TONES) {
    if (typeof pat === 'string') {
      if (lower.includes(pat)) return { ok: false, reason: `forbidden:${pat}` };
    } else if (pat.test(line)) {
      return { ok: false, reason: `forbidden:${pat.source}` };
    }
  }
  return { ok: true };
}

export type RenderInput = {
  tone: MoveTone;
  ctx: MoveContext;
  /** Stable seed (e.g. hash of userId+matchId+date) so the same pair gets the
   *  same Move within a day. */
  seed?: number;
};

export type RenderResult =
  | { ok: true; line: string; tone: MoveTone; templateIndex: number }
  | { ok: false; reason: string };

/**
 * Render a Move. Tries the seeded template first; on lint failure, walks the
 * remaining templates of the same tone before giving up.
 */
export function renderMove(input: RenderInput): RenderResult {
  const seed = input.seed ?? Date.now();
  const list = TEMPLATES[input.tone];
  for (let offset = 0; offset < list.length; offset++) {
    const idx = (Math.abs(Math.floor(seed)) + offset) % list.length;
    const tpl = list[idx];
    const line = fill(tpl, input.ctx);
    const lint = lintMove(line);
    if (lint.ok) return { ok: true, line, tone: input.tone, templateIndex: idx };
  }
  return { ok: false, reason: 'all_templates_failed_lint' };
}

/** Map an observed user-archetype hint to the most natural tone. */
export function toneFromArchetype(
  archetype: 'wordsmith' | 'voice_first' | 'visual' | 'fast_replier' | string,
): MoveTone {
  switch (archetype) {
    case 'wordsmith':    return 'reflective';
    case 'voice_first':  return 'casual';
    case 'visual':       return 'tactile';
    case 'fast_replier': return 'quick';
    default:             return 'casual';
  }
}

export const __test__ = { pickTemplate, fill, TEMPLATES };
