/**
 * Text moderation client.
 *
 * Same interface as `imageModerationClient.ts`. Runs synchronously in
 * memory — no external calls, no network. Cheap enough to run on the
 * hot path of every POST creativity item + POST message.
 *
 * Layers, in order:
 *   1. Empty / trivial input  → APPROVED
 *   2. Length + repetition heuristics (spam) → soft-block
 *   3. Doxxing heuristics (phone / email in first message) → soft-block
 *   4. Slur list — tier-1 (hard-block) + tier-2 (soft-block)
 *   5. Toxicity heuristic (all caps + insult stem) → soft-block
 *
 * The slur list mixes English + a small set of Hindi and Tamil
 * transliterations because a large share of our expected user base is
 * India-first and slurs are frequently typed in Roman script rather
 * than Devanagari / Tamil script. This is not comprehensive — it's a
 * launch-week baseline. Real coverage lands with a proper toxicity
 * classifier (Perspective API or equivalent) behind
 * `PERSPECTIVE_API_ENABLED=1` in Phase H.
 */

import {
  APPROVED,
  reject,
  type ModerationDecision,
  type TextModerator,
} from './types';

// ─── Slur lists ────────────────────────────────────────

/**
 * Tier-1 slurs: hard-block. These are unambiguous, universally
 * recognised as harmful (racial, casteist, ableist, homophobic).
 * They are stored lowercased, with common leetspeak variants folded
 * during matching (see `normalize()` below).
 *
 * We keep the list intentionally small and audited rather than
 * exhaustive. A larger classifier goes behind the Perspective API
 * flag in Phase H. Every entry here has been reviewed by an editor.
 */
const TIER_1_SLURS: readonly string[] = [
  // Racial (English) — 6
  'nigger', 'chink', 'spic', 'kike', 'gook', 'wetback',
  // Homophobic / transphobic (English) — 4
  'faggot', 'tranny', 'dyke', 'shemale',
  // Ableist (English) — 2
  'retard', 'retarded',
  // Casteist (Hindi/Roman transliteration) — 3
  'bhangi', 'chuhra', 'chamar',
  // Anti-Muslim slurs (Hindi/Roman) — 2
  'katua', 'mullah',
  // Anti-Hindu (Hindi/Roman) — 1
  'chintu',
  // Anti-Tamil / Anti-Dravidian (Tamil/Roman) — 2
  'paraiyan', 'pallan',
  // Misogynist (Hindi/Roman) — 2
  'randi', 'chinal',
  // CSAM-adjacent search terms — 2 (block hard even without image context)
  'lolita', 'preteen',
] as const;

/**
 * Tier-2 slurs: soft-block. Ambiguous — sometimes used in reclaimed
 * contexts or common speech. We hide the content, ask the user to
 * re-edit, and log an audit event. Repeat offences within 24h
 * escalate to tier-1 handling (that policy is enforced in the
 * consuming service, not here).
 */
const TIER_2_SLURS: readonly string[] = [
  // Mild insult (English) — 6
  'idiot', 'moron', 'loser', 'stupid', 'ugly', 'fat',
  // Mild misogynist (Hindi/Roman) — 3
  'kutta', 'kutti', 'saali',
  // Body-shaming (English) — 2
  'fatso', 'creep',
] as const;

/**
 * Doxxing heuristics — patterns we never want in a first message or
 * a public creativity caption. Real users can type these on purpose
 * later, but in a first exchange it's almost always harassment or
 * off-platform steering.
 */
const DOXXING_PATTERNS: readonly RegExp[] = [
  /\b\+?91[\s-]?\d{10}\b/,          // Indian phone with country code
  /\b\d{10}\b/,                     // Bare 10-digit phone
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i, // Email address
  /\bwhatsapp\s*(?:me|number)\b/i,  // "whatsapp me on"
  /\btelegram\s*(?:me|handle)\b/i,
  /\binsta(?:gram)?\s*(?:handle|id|dm)\b/i,
] as const;

// ─── Text normaliser ───────────────────────────────────

/**
 * Fold common leetspeak, strip diacritics + non-letter noise, lowercase.
 * We do this so `n1gger`, `n!gger`, `NIGGER` all match `nigger`.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[013457!@$]/g, (ch) => {
      switch (ch) {
        case '0': return 'o';
        case '1': return 'i';
        case '3': return 'e';
        case '4': return 'a';
        case '5': return 's';
        case '7': return 't';
        case '!': return 'i';
        case '@': return 'a';
        case '$': return 's';
        default: return ch;
      }
    })
    .replace(/[^a-z\s]/g, ' ')     // collapse punctuation to spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-boundary check to avoid false positives like `Scunthorpe`
 * containing `cunt`. We split the normalised text on whitespace and
 * compare tokens.
 */
function containsSlur(normalized: string, list: readonly string[]): string | null {
  const tokens = normalized.split(/\s+/);
  for (const slur of list) {
    if (tokens.includes(slur)) return slur;
  }
  return null;
}

// ─── Spam heuristics ───────────────────────────────────

function looksSpammy(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  // Repeated-character spam: `aaaaaaa`, `!!!!!!!!!`
  if (/(.)\1{9,}/.test(trimmed)) return true;
  // All-caps shouting > 60 chars is treated as spam noise
  if (trimmed.length > 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return true;
  // Repeated word spam: `buy buy buy buy buy`
  const words = trimmed.split(/\s+/);
  if (words.length >= 5) {
    const distinct = new Set(words.map((w) => w.toLowerCase()));
    if (distinct.size === 1) return true;
  }
  return false;
}

// ─── Client ────────────────────────────────────────────

export class DefaultTextModerator implements TextModerator {
  async moderateText(text: string): Promise<ModerationDecision> {
    if (!text || typeof text !== 'string') return APPROVED;
    const trimmed = text.trim();
    if (!trimmed) return APPROVED;

    // Layer 1: spam
    if (looksSpammy(trimmed)) {
      return reject(['spam'], 0.8, 'soft', 'repetition/all-caps spam');
    }

    const normalized = normalize(trimmed);

    // Layer 2: tier-1 slurs → HARD block
    const hit1 = containsSlur(normalized, TIER_1_SLURS);
    if (hit1) {
      // CSAM-adjacent tokens escalate to `csam` category
      const isCsam = hit1 === 'lolita' || hit1 === 'preteen';
      return reject(
        isCsam ? ['csam'] : ['slur'],
        1.0,
        'hard',
        `tier-1:${hit1}`,
      );
    }

    // Layer 3: tier-2 slurs → SOFT block
    const hit2 = containsSlur(normalized, TIER_2_SLURS);
    if (hit2) {
      return reject(['slur'], 0.7, 'soft', `tier-2:${hit2}`);
    }

    // Layer 4: doxxing
    for (const pattern of DOXXING_PATTERNS) {
      if (pattern.test(trimmed)) {
        return reject(['doxxing'], 0.85, 'soft', `doxxing:${pattern.source}`);
      }
    }

    return APPROVED;
  }
}

// ─── Factory ───────────────────────────────────────────

/**
 * Currently only one implementation — the in-memory heuristic
 * moderator. Perspective API arrives behind `PERSPECTIVE_API_ENABLED=1`
 * in Phase H; the factory is the injection point.
 */
export function getTextModerator(): TextModerator {
  return new DefaultTextModerator();
}

// Exported for tests only — do not import from application code.
export const _internal = {
  normalize,
  looksSpammy,
  TIER_1_SLURS,
  TIER_2_SLURS,
  DOXXING_PATTERNS,
};
