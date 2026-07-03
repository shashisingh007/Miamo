/**
 * Code-Mix Template Family — v8 Move v2 Composer (Section C, §4).
 *
 * 4 language families × 5 opener archetypes × 4 tones = 80 templates.
 * Detection via char-trigram score over the sender's recent outbound
 * messages; English is the no-regret fallback under 0.6 confidence.
 *
 * Pure module: no LLM, no embeddings. Trigram weights are hand-tuned
 * romanized cues — sufficient signal for last-20-message heuristic.
 */

export type LanguageFamily = 'en' | 'hi_en' | 'ta_en' | 'bn_en';
export type OpenerArchetype = 'question' | 'compliment' | 'shared_interest' | 'playful' | 'specific_detail';
export type CodeMixTone = 'reflective' | 'casual' | 'tactile' | 'quick';

export const LANGUAGE_FAMILIES: readonly LanguageFamily[] = ['en', 'hi_en', 'ta_en', 'bn_en'] as const;
export const OPENER_ARCHETYPES: readonly OpenerArchetype[] = [
  'question', 'compliment', 'shared_interest', 'playful', 'specific_detail',
] as const;
export const CODE_MIX_TONES: readonly CodeMixTone[] = ['reflective', 'casual', 'tactile', 'quick'] as const;

// because: §4.3 F4.3 — under 0.6 misclassification cost exceeds match cost
export const DETECTION_CONFIDENCE_THRESHOLD = 0.6;

// because: §4.6 — keep templates well under 90 chars after fill
export const TEMPLATE_MAX_LEN = 90;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

// because: top trigram cues per family — hand-picked from common Hinglish /
// Tanglish / Banglish chat tokens. Weights = relative frequency hints.
// Single source-of-truth: weights are arbitrary positive numbers; the
// detector normalises by total score across all families.
const TRIGRAM_PROFILES: Record<LanguageFamily, Record<string, number>> = {
  en: {
    // because: high-volume English chat trigrams
    'the': 5, 'and': 4, 'you': 4, 'ing': 3, 'tha': 3, 'her': 2, 'hat': 2,
    'ent': 2, 'ion': 2, 'for': 2, 'are': 2, 'wit': 2, 'ith': 2, 'thi': 2,
    'tio': 2, 'ave': 2, 'oul': 2, 'eve': 2, 'wha': 2, 'hav': 2,
  },
  hi_en: {
    // because: Hinglish romanized cues — kya, hai, yaar, scene, bhai, etc.
    'kya': 5, 'hai': 5, 'aar': 3, 'yaa': 3, 'bha': 3, 'cen': 3, 'ene': 3,
    'cha': 2, 'acc': 2, 'kar': 3, 'mer': 3, 'ein': 2, 'tum': 2, 'aap': 2,
    'aho': 2, 'aur': 3, 'hii': 2, 'kuc': 2, 'uch': 2, 'pe ': 2, 'wal': 2,
    'ala': 2, 'aro': 2, 'oh ': 2,
  },
  ta_en: {
    // because: Tanglish romanized cues — epdi, iruka, sema, da, makka, etc.
    'epd': 5, 'pdi': 5, 'iru': 4, 'ruk': 4, 'uka': 4, 'sem': 3, 'ema': 3,
    ' da': 4, 'mak': 3, 'akk': 3, 'kka': 3, 'una': 2,
    'enn': 3, 'nna': 2, 'nad': 3, 'pan': 2, 'ann': 3, 'aru': 3, 'thu': 2,
    'aha': 2, 'kit': 2, 'sol': 3, 'olu': 3,
  },
  bn_en: {
    // because: Banglish romanized cues — bolish, khabor, tor, kichu, niye, etc.
    'bol': 4, 'oli': 3, 'lis': 3, 'ish': 3, 'kha': 3, 'hab': 3, 'abo': 3,
    'bor': 3, 'tor': 4, 'kic': 3, 'ich': 3, 'chu': 2, 'niy': 4, 'iye': 4,
    'kot': 3, 'oth': 3, 'tha': 2, 'ami': 4, 'mio': 2, 'noh': 2, 'oho': 2,
    'kor': 3, 'ach': 3, 'che': 3, 'eka': 2, 'ekt': 3, 'kta': 3,
  },
};

function trigramsOf(s: string): string[] {
  if (!s) return [];
  const lower = s.toLowerCase();
  const tris: string[] = [];
  for (let i = 0; i + 3 <= lower.length; i++) tris.push(lower.slice(i, i + 3));
  return tris;
}

/**
 * Detect language family from a small message corpus. Returns the
 * chosenFamily plus its normalised confidence in [0..1].
 *
 * (F4.2) confidence = score(chosen) / sum(scores).
 * (F4.3) If confidence < 0.6, return en with the chosen confidence.
 */
export function detectLanguageFamily(samples: string[]): { family: LanguageFamily; confidence: number } {
  if (!samples || samples.length === 0) {
    // because: §4.3 — no signal → English fallback at zero confidence
    return { family: 'en', confidence: 0 };
  }

  const scores: Record<LanguageFamily, number> = { en: 0, hi_en: 0, ta_en: 0, bn_en: 0 };

  for (const msg of samples) {
    const tris = trigramsOf(msg);
    for (const t of tris) {
      for (const fam of LANGUAGE_FAMILIES) {
        const w = TRIGRAM_PROFILES[fam][t];
        if (w) scores[fam] += w;
      }
    }
  }

  let total = 0;
  for (const fam of LANGUAGE_FAMILIES) total += scores[fam];

  if (total <= 0) {
    return { family: 'en', confidence: 0 };
  }

  let bestFam: LanguageFamily = 'en';
  let bestScore = -1;
  for (const fam of LANGUAGE_FAMILIES) {
    if (scores[fam] > bestScore) {
      bestScore = scores[fam];
      bestFam = fam;
    }
  }

  const confidence = bestScore / total;

  // because: §4.3 F4.3 — below threshold, English is the no-regret fallback
  if (confidence < DETECTION_CONFIDENCE_THRESHOLD) {
    return { family: 'en', confidence };
  }

  return { family: bestFam, confidence };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface CodeMixTemplate {
  family: LanguageFamily;
  archetype: OpenerArchetype;
  tone: CodeMixTone;
  template: string;
}

// because: keep templates short, lowercase-start, casual register so they
// pass the moveVoice linter (no em-dash, no single `!` is fine but the
// extended linter only bans `!!!`+, no banned phrases, no tricolons, no
// "I noticed" / "consider" / "leverage" etc.)
//
// Each template uses {NAME} and {HOOK} placeholders. Templates have at least
// one fragment OR a lowercase start so the "too_polished" / "ai_signature"
// compound checks don't fire (they require: no typos, no fragments, uppercase
// start, length > 80 — we keep length < 80 and start lowercase).

// English templates (en × 5 archetypes × 4 tones = 20)
const TEMPLATES_EN: Record<OpenerArchetype, Record<CodeMixTone, string>> = {
  question: {
    reflective: "{NAME}, what's the story behind {HOOK}",
    casual:     "hey {NAME}, what's up with {HOOK}",
    tactile:    "show me {HOOK}, {NAME}. quick one",
    quick:      "{NAME}: {HOOK}? yes or no",
  },
  compliment: {
    reflective: "{NAME}, the {HOOK} thing, quietly love that",
    casual:     "{NAME}, {HOOK} is a solid vibe",
    tactile:    "your {HOOK} bit, {NAME}. send a pic",
    quick:      "{NAME}: {HOOK}, big yes",
  },
  shared_interest: {
    reflective: "{NAME}, i also got into {HOOK} this year",
    casual:     "{NAME} same here on {HOOK}, what pulled you in",
    tactile:    "{NAME}, my {HOOK} corner needs your eyes",
    quick:      "same on {HOOK}, {NAME}",
  },
  playful: {
    reflective: "{NAME}, low-key {HOOK} is the move",
    casual:     "okay {NAME}, defend {HOOK} in one line",
    tactile:    "{NAME}, send the {HOOK} pic, no caption",
    quick:      "{NAME}: {HOOK} or pass",
  },
  specific_detail: {
    reflective: "{NAME}, the {HOOK} bit pulled me in",
    casual:     "{NAME} that {HOOK} note, where was that",
    tactile:    "your {HOOK} pic, {NAME}. drop a story",
    quick:      "{NAME}: {HOOK}? when",
  },
};

// Hinglish (hi_en × 5 × 4 = 20)
const TEMPLATES_HI_EN: Record<OpenerArchetype, Record<CodeMixTone, string>> = {
  question: {
    reflective: "{NAME}, {HOOK} ka scene kya hai actually",
    casual:     "{NAME}, {HOOK} ka kya scene hai",
    tactile:    "{NAME}, wo {HOOK} wala pic bhej",
    quick:      "{NAME}: {HOOK}? haan ya na",
  },
  compliment: {
    reflective: "{NAME}, {HOOK} wali baat, accha lagi",
    casual:     "{NAME} {HOOK} is solid yaar",
    tactile:    "{NAME}, {HOOK} pic dikha de",
    quick:      "{NAME}: {HOOK}, bohot accha",
  },
  shared_interest: {
    reflective: "haan same {NAME}, {HOOK} mera bhi vibe hai",
    casual:     "{NAME} mujhe bhi {HOOK} pasand hai, tujhe kaisa laga",
    tactile:    "{NAME}, mera {HOOK} corner dikhau",
    quick:      "same on {HOOK}, {NAME}",
  },
  playful: {
    reflective: "{NAME}, {HOOK} pe ek baat, try ki kya",
    casual:     "okay {NAME}, {HOOK} ya nahi, bata",
    tactile:    "{NAME}, {HOOK} pic, ek line caption",
    quick:      "{NAME}: {HOOK} ya pass",
  },
  specific_detail: {
    reflective: "{NAME}, {HOOK} wali baat dilchasp lagi",
    casual:     "{NAME}, {HOOK} ka pic kahaan ka tha",
    tactile:    "{NAME}, {HOOK} ka shot bhej",
    quick:      "{NAME}: {HOOK}? kab",
  },
};

// Tanglish (ta_en × 5 × 4 = 20)
const TEMPLATES_TA_EN: Record<OpenerArchetype, Record<CodeMixTone, string>> = {
  question: {
    reflective: "{NAME}, {HOOK} epdi feel pannitu iruka",
    casual:     "{NAME}, {HOOK} pathi sollu",
    tactile:    "{NAME}, {HOOK} pic anuppu da",
    quick:      "{NAME}: {HOOK}? una style",
  },
  compliment: {
    reflective: "{NAME}, {HOOK} super da, una take enna",
    casual:     "{NAME} {HOOK} sema da",
    tactile:    "{NAME}, {HOOK} pic kaatu",
    quick:      "{NAME}: {HOOK}, big yes",
  },
  shared_interest: {
    reflective: "naanum {HOOK} fan da {NAME}, what pulled you in",
    casual:     "{NAME} same here on {HOOK} da",
    tactile:    "{NAME}, en {HOOK} corner show pannu",
    quick:      "same on {HOOK}, {NAME}",
  },
  playful: {
    reflective: "{NAME}, low-key {HOOK} pathi sollu",
    casual:     "ok {NAME}, {HOOK} ya illa, sollu",
    tactile:    "{NAME}, {HOOK} pic anuppu, no caption",
    quick:      "{NAME}: {HOOK} or skip",
  },
  specific_detail: {
    reflective: "{NAME}, unga {HOOK} bit story irukku",
    casual:     "{NAME}, {HOOK} pic engaye eduthadhu",
    tactile:    "{NAME}, {HOOK} shot bhej da",
    quick:      "{NAME}: {HOOK}? eppo",
  },
};

// Banglish (bn_en × 5 × 4 = 20)
const TEMPLATES_BN_EN: Record<OpenerArchetype, Record<CodeMixTone, string>> = {
  question: {
    reflective: "{NAME}, {HOOK} ta darun, konthay tola",
    casual:     "{NAME}: {HOOK}? ki bolish",
    tactile:    "{NAME}, oi {HOOK} pic ta pathao",
    quick:      "{NAME}: {HOOK}? haan na",
  },
  compliment: {
    reflective: "{NAME}, {HOOK} ta khub bhalo laglo",
    casual:     "{NAME} {HOOK} ta solid",
    tactile:    "{NAME}, {HOOK} pic ta dekha",
    quick:      "{NAME}: {HOOK}, bhalo",
  },
  shared_interest: {
    reflective: "ami o {HOOK} kori {NAME}, tor experience ki",
    casual:     "{NAME} amaro {HOOK} bhalo lage",
    tactile:    "{NAME}, ami {HOOK} corner dekhabo",
    quick:      "same on {HOOK}, {NAME}",
  },
  playful: {
    reflective: "{NAME}, {HOOK} niye ekta katha, tor opinion",
    casual:     "ok {NAME}, {HOOK} or onno kichu",
    tactile:    "{NAME}, {HOOK} pic ta pathao, caption lagbe na",
    quick:      "{NAME}: {HOOK} or skip",
  },
  specific_detail: {
    reflective: "{NAME}, oi {HOOK} ta darun, kothay tola",
    casual:     "{NAME}, {HOOK} pic ta kothay",
    tactile:    "{NAME}, {HOOK} shot ta pathao",
    quick:      "{NAME}: {HOOK}? kobe",
  },
};

function flatten(
  family: LanguageFamily,
  byArch: Record<OpenerArchetype, Record<CodeMixTone, string>>,
): CodeMixTemplate[] {
  const out: CodeMixTemplate[] = [];
  for (const archetype of OPENER_ARCHETYPES) {
    for (const tone of CODE_MIX_TONES) {
      out.push({ family, archetype, tone, template: byArch[archetype][tone] });
    }
  }
  return out;
}

export const TEMPLATES: readonly CodeMixTemplate[] = [
  ...flatten('en', TEMPLATES_EN),
  ...flatten('hi_en', TEMPLATES_HI_EN),
  ...flatten('ta_en', TEMPLATES_TA_EN),
  ...flatten('bn_en', TEMPLATES_BN_EN),
];

/**
 * Pull templates filtered by family + optional archetype + optional tone.
 * Returns a fresh array so callers can shuffle without mutating constants.
 */
export function getTemplates(
  family: LanguageFamily,
  archetype?: OpenerArchetype,
  tone?: CodeMixTone,
): CodeMixTemplate[] {
  return TEMPLATES.filter((t) => {
    if (t.family !== family) return false;
    if (archetype && t.archetype !== archetype) return false;
    if (tone && t.tone !== tone) return false;
    return true;
  });
}

/** Cheap stable fill — keep identical behaviour to moveVoice.fill(). */
export function fillTemplate(template: string, name: string, hook: string): string {
  const safeName = (name ?? '').trim() || 'you';
  const safeHook = (hook ?? '').trim() || 'that thing';
  return template
    .replace(/\{NAME\}/g, safeName)
    .replace(/\{HOOK\}/g, safeHook);
}

export const __test__ = {
  TRIGRAM_PROFILES,
  trigramsOf,
  TEMPLATES_EN,
  TEMPLATES_HI_EN,
  TEMPLATES_TA_EN,
  TEMPLATES_BN_EN,
};
