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
  // because: §C.6.2 — tightened from blanket 'consider ' substring; this
  // avoids nuking benign uses like "consider it done"
  /\bconsider\s+(asking|trying|reaching)/i,
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
  // because: §C.6.2 — zero exclamations is itself an AI tell; allow a single `!`
  // but ban runs of 3+ which read as performative shouting.
  /!{3,}/,
  /\?{2,}/,          // double question marks
];

/**
 * v8 Move v2 additions — 26 new forbidden phrases / patterns from design §C.6.1.
 * Merged with FORBIDDEN_TONES inside `lintMoveV8()`; keeping them in a separate
 * array preserves the v3 linter contract for callers that haven't migrated.
 */
export const FORBIDDEN_TONES_V8: ReadonlyArray<string | RegExp> = [
  'genuinely',                     // because: LLM self-description tic; almost never typed in chat
  'authentic',                     // because: corporate marketing residue
  'thoughtful',                    // because: LLM compliment-fallback; reads sterile
  'love your vibe',                // because: generic empty-compliment cluster (§1.5)
  'your energy',                   // because: same cluster
  'i love how',                    // because: LLM opener stem (post-"I noticed" replacement)
  'i can tell',                    // because: profile-scraping inference claim
  'it sounds like',                // because: therapy-speak; LLM hedge
  'speaking of which',             // because: bridge phrase no one types
  'that said',                     // because: connective only LLMs use in chat
  'moreover',                      // because: same
  'additionally',                  // because: same
  /\bquite\b/i,                    // because: intensifier 5× more common in LLMs (§1.14)
  /\brather\b/i,                   // because: same intensifier cluster
  /\btruly\b/i,                    // because: LLM affirmation tic
  "i'd love to",                   // because: soft-ask construction over-used by LLMs
  'would love to',                 // because: variant of above
  'could perhaps',                 // because: hedge cluster (§1.12)
  'may be worth',                  // because: hedge cluster
  "if you're open to",             // because: hedge cluster
  'tell me more about',            // because: LLM follow-up stem
  'what draws you to',             // because: LLM probe construction
  'meditative',                    // because: over-precise descriptor cluster
  'centering',                     // because: same cluster
  /✨/,                            // because: sparkles emoji — anomalous in target demo (§1.8)
  /😊\s*$/,                        // because: trailing small-smile — corporate signal
];

// because: MAX_LEN reused below for the polished-flag length cap; §C.6.3
const TOO_POLISHED_LEN = 80;

/**
 * Compound "too polished" check (design §C.6.3). Fires when **all four** are
 * true: no typos heuristic, no fragments, uppercase start, length > 80.
 *
 * Returns true if the line reads as suspiciously perfect — the composer
 * uses this to retry with a lower-register template.
 */
export function tooPolishedFlag(text: string): boolean {
  if (!text) return false;
  const len = text.length;
  if (len <= TOO_POLISHED_LEN) return false;

  // because: uppercase-start required for the polished class
  const firstChar = text.trim().charAt(0);
  if (!(firstChar >= 'A' && firstChar <= 'Z')) return false;

  // because: no fragments = every split piece has ≥3 words
  const pieces = text.split(/[.!?]+/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (pieces.length === 0) return false;
  for (const p of pieces) {
    const w = (p.match(/\S+/g) ?? []).length;
    if (w > 0 && w < 3) return false; // a fragment exists → not "too polished"
  }

  // because: no-typo heuristic — letters-only words; if any contains a digit
  // or an internal apostrophe miss, treat as "has typos". For a polished
  // line every word should be pure letters / standard contractions.
  const words = text.match(/[A-Za-z']+/g) ?? [];
  for (const w of words) {
    // because: detect "creative spelling" markers — repeated letters >=3,
    // numbers-in-words, or random caps mid-word; absence = polished
    if (/[a-z][A-Z]/.test(w)) return false;
    if (/(.)\1\1/.test(w)) return false;
  }

  return true;
}

/**
 * "AI signature" compound check (design §C.6.4). Fires when:
 *  - no `!` in line
 *  - no typos
 *  - 2+ sentences
 *  - every sentence ends with terminal punctuation
 */
export function aiSignatureFlag(text: string): boolean {
  if (!text) return false;
  if (text.includes('!')) return false;

  // because: terminal-punctuation count = sentence count proxy
  const terminals = (text.match(/[.?]/g) ?? []).length;
  if (terminals < 2) return false;

  // because: every sentence ends with terminal punctuation =
  // text trimmed ends with one AND no dangling clause after the last terminal
  const trimmed = text.trimEnd();
  if (!/[.?]$/.test(trimmed)) return false;

  // because: typo proxy — repeated triple letters / digit-in-word
  const words = trimmed.match(/[A-Za-z']+/g) ?? [];
  for (const w of words) {
    if (/(.)\1\1/.test(w)) return false;
  }
  if (/\d/.test(trimmed)) return false;

  return true;
}

/**
 * Tricolon detector (design §C.6.5). Matches "bold, thoughtful, and playful"
 * pattern — humans almost never list three adjectives in chat.
 */
export function tricolonFlag(text: string): boolean {
  if (!text) return false;
  return /\b\w+,\s+\w+,\s+and\s+\w+/i.test(text);
}

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

/**
 * v8 extended linter — runs the original `lintMove` plus the v8 additions
 * (FORBIDDEN_TONES_V8 + tooPolishedFlag + aiSignatureFlag + tricolonFlag).
 *
 * Backward-compatible by addition: callers can pass v3 lines and the v8
 * linter strictly tightens, never loosens.
 */
export function lintMoveV8(line: string): { ok: boolean; reason?: string } {
  // because: reuse the v3 contract first — em-dash, length, original 16
  const base = lintMove(line);
  if (!base.ok) return base;

  const lower = line.toLowerCase();
  for (const pat of FORBIDDEN_TONES_V8) {
    if (typeof pat === 'string') {
      if (lower.includes(pat)) return { ok: false, reason: `forbidden:${pat}` };
    } else if (pat.test(line)) {
      return { ok: false, reason: `forbidden:${pat.source}` };
    }
  }

  // because: compound checks per §C.6.3-§C.6.5
  if (tricolonFlag(line)) return { ok: false, reason: 'tricolon' };
  if (tooPolishedFlag(line)) return { ok: false, reason: 'too_polished' };
  if (aiSignatureFlag(line)) return { ok: false, reason: 'ai_signature' };

  return { ok: true };
}
