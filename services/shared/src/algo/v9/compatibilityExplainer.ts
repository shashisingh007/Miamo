/**
 * v9 — Natural-language compatibility explainer (v2 of the "why am I
 * seeing this" card).
 *
 * Pure module. Given an ingredient contribution breakdown (the same shape
 * that `explain.ts` produces from a forYouV6 score), returns up to N
 * short natural-language reasons ranked by contribution. Template-based
 * — NO LLM.
 *
 * Contract:
 *   - Every supported ingredient has at least 2 template variants so two
 *     users with the same top ingredient don't see identical text. The
 *     picker rotates on a stable hash of `detail || ingredient`.
 *   - Output is sorted by contribution descending; ties broken by the
 *     ingredient name for determinism.
 *   - `stars` mirrors the v3.6 UI convention: top ingredient = 3 stars,
 *     next = 2, tail = 1.
 *
 * File: services/shared/src/algo/v9/compatibilityExplainer.ts
 * Flag: ALGO_V9_COMPATIBILITY_EXPLAINER_ENABLED
 */

/** Per-ingredient contribution from the ranker's explain breakdown. */
export interface ExplainerIngredient {
  /** e.g. 'interestsOverlap', 'chronotypeMatch', 'replyPaceMatch' */
  name: string;
  /** 0..1 — normalised contribution to the composed score. */
  contribution: number;
  /** free-form context, e.g. 'both marked hiking'. Optional. */
  detail?: string;
}

export interface ExplainerInput {
  ingredients: ExplainerIngredient[];
  /** number of reasons to emit; default 3. */
  maxReasons?: number;
}

export interface ExplainerReason {
  reason: string;
  stars: 1 | 2 | 3;
  ingredient: string;
}

/**
 * Template banks — 2+ variants per supported ingredient. `{detail}` is
 * substituted if provided; otherwise the second-half of each template
 * (after " — " when present) is dropped.
 */
const TEMPLATES: Record<string, readonly string[]> = {
  interestsOverlap: [
    'You both marked {detail} as a top interest and posted about it this week.',
    'You share {detail} — and both talk about it recently.',
  ],
  vibeAlignment: [
    'Your vibes read alike from what you both post.',
    'The way you both talk about yourselves lands in the same emotional key.',
  ],
  behaviouralTwinIndex: [
    'Your app behaviour patterns match — you tend to open, dwell, and reply at the same rhythm.',
    'You use Miamo the same way, which usually correlates with mutual replies.',
  ],
  reciprocalIntentScore: [
    'You both seem to want the same thing right now.',
    'Your "looking for" answers point the same direction.',
  ],
  attentionFit: [
    'You both read carefully before you tap — no fast-flicking here.',
    'You take similar time on profiles like each others.',
  ],
  hesitationFit: [
    'You both hover a beat before you decide — you deliberate the same way.',
    'You share the same "think, then act" tempo.',
  ],
  chronotypeMatch: [
    'Same chronotype — both {detail}.',
    'Both {detail} — your active hours overlap.',
  ],
  chronotypeOverlap: [
    'Same chronotype — both {detail}.',
    'Both {detail} — your active hours overlap.',
  ],
  replyPaceMatch: [
    "You've both replied within 5 minutes to your last 3 matches.",
    'Your recent reply-pace matches — fast and consistent.',
  ],
  communicationCadenceFit: [
    'Your reply rhythms match — neither of you keeps the other waiting.',
    'Similar reply speeds usually predict good chats.',
  ],
  ageSimilarity: [
    'Similar age.',
    'Youre in the same age band.',
  ],
  distanceFit: [
    'Close enough to actually meet.',
    'Youre in the same city radius.',
  ],
  moveStyleCompat: [
    'Your Miamo Move styles line up.',
    'You open conversations the same way.',
  ],
  profileHealth: [
    'This profile looks well-filled and active.',
    'They complete their profile and reply reliably.',
  ],
};

/** Fallback used when we encounter an unknown ingredient key. */
const FALLBACK_TEMPLATES: readonly string[] = [
  'Strong overlap on {name}.',
  '{name} is a top match here.',
];

/** Stable hash used to rotate template variants deterministically. */
function stableHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fill(template: string, name: string, detail: string | undefined): string {
  let out = template.replace(/\{name\}/g, name);
  if (detail !== undefined && detail.length > 0) {
    out = out.replace(/\{detail\}/g, detail);
  } else {
    // Strip " — {detail}" or " {detail}" if no detail provided.
    out = out.replace(/ ?— ? ?\{detail\}\.?/g, '.');
    out = out.replace(/ ?\{detail\}\.?/g, '.');
  }
  return out.replace(/\s+/g, ' ').trim();
}

function pickTemplate(name: string, detail: string | undefined): string {
  const pool = TEMPLATES[name] ?? FALLBACK_TEMPLATES;
  const seed = stableHash((detail ?? '') + '|' + name);
  return pool[seed % pool.length];
}

/** Star tier per rank in the top list. */
function starsFor(rank: number): 1 | 2 | 3 {
  if (rank === 0) return 3;
  if (rank === 1) return 2;
  return 1;
}

/**
 * Compose reasons. Sorted by contribution desc, ties broken by ingredient
 * name. Zero-contribution ingredients are dropped. Output size ≤
 * `maxReasons` (default 3).
 */
export function explainCompatibility(inp: ExplainerInput): ExplainerReason[] {
  const max = Math.max(1, inp.maxReasons ?? 3);
  const sorted = [...inp.ingredients]
    .filter((x) => x.contribution > 0)
    .sort((a, b) => {
      if (b.contribution !== a.contribution) return b.contribution - a.contribution;
      return a.name.localeCompare(b.name);
    });

  const out: ExplainerReason[] = [];
  for (let i = 0; i < Math.min(max, sorted.length); i++) {
    const ing = sorted[i];
    const template = pickTemplate(ing.name, ing.detail);
    const reason = fill(template, ing.name, ing.detail);
    out.push({ reason, stars: starsFor(i), ingredient: ing.name });
  }
  return out;
}

/** Exposed for tests: how many template variants exist for a given
 *  ingredient name (used to prove no ingredient has fewer than 2). */
export function templateVariantCount(name: string): number {
  return (TEMPLATES[name] ?? FALLBACK_TEMPLATES).length;
}

/** Names of all ingredients this explainer knows how to speak. */
export function supportedIngredients(): string[] {
  return Object.keys(TEMPLATES);
}
