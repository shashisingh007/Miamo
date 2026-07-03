/**
 * Sender Voice Model — v8 Move v2 Composer (Section C, §1).
 *
 * Extracts a statistical "voice fingerprint" from the sender's last K=50
 * outbound text messages. Pure module: never touches Prisma — the calling
 * service hands in plain strings. No LLM, no embeddings.
 *
 * Output `SenderVoiceVector` feeds the composer post-processor (§5.6),
 * which bends rendered templates toward the user's habits (lowercase-i,
 * contraction rate, exclamation rate, ...).
 */

import { clip01 } from '../../math';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface OutboundMessageSample {
  content: string;
  createdAtMs: number;
}

export interface SenderVoiceVector {
  medianLengthChars: number;
  medianLengthWords: number;
  emojiRate: number;                  // emojis per message
  topEmojis: string[];                 // up to 3 most-used
  emDashRate: number;
  exclamationRate: number;
  questionRate: number;
  commaPerWord: number;
  fragmentsPerMessage: number;
  lowercaseIRate: number;              // standalone " i " vs "I " usage
  lowercaseStartRate: number;
  typoRateApprox: number;              // proxy: words not in common-dict
  contractionRate: number;             // "don't" vs "do not"
  laughTokenRate: number;              // lol|haha|lmao frequency
  sampleCount: number;
  confidence: number;                  // clip01(sampleCount / SAMPLE_TARGET)
}

// because: 50 samples plateaus voice estimation — MARKET_SCAN §4.5 floor
export const SAMPLE_TARGET = 50;
// because: below 10 messages the per-feature noise exceeds the signal
export const MIN_SAMPLES = 10;
// because: bound input — if a caller passes a huge buffer, ignore the rest
export const MAX_SAMPLES = 50;

/** Neutral fallback used when sampleCount < MIN_SAMPLES. */
export const NEUTRAL_VOICE: SenderVoiceVector = {
  // because: population medians from MARKET_SCAN §1.3 chat corpus (rounded)
  medianLengthChars: 25,
  medianLengthWords: 5,
  emojiRate: 0.2,
  topEmojis: [],
  emDashRate: 0,
  exclamationRate: 0.15,        // because: §1.11 — typical 15% rate of exclamations in casual chat
  questionRate: 0.25,
  commaPerWord: 0.05,
  fragmentsPerMessage: 0.5,
  lowercaseIRate: 0.5,          // because: 50/50 midpoint; reduced influence on neutral senders
  lowercaseStartRate: 0.6,
  typoRateApprox: 0.05,
  contractionRate: 0.7,         // because: contractions dominate casual register
  laughTokenRate: 0.1,
  sampleCount: 0,
  confidence: 0,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// because: regex catches the major Unicode emoji blocks used in chat
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}]/gu;

// because: dictionary of ~200 most-common English chat tokens — typo proxy
// for words not in this list. Keeps memory tiny; misses are accepted as
// "approx typo rate" per §1.5 F1.6.
const COMMON_DICT: ReadonlySet<string> = new Set([
  // articles, pronouns, common verbs
  'a','an','the','and','or','but','i','you','he','she','it','we','they','me',
  'us','him','her','them','my','your','our','their','his','its','this','that',
  'these','those','am','is','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','can','could','should','may',
  'might','must','shall',
  // common nouns, adjectives, adverbs
  'one','two','three','time','day','night','morning','evening','today',
  'tomorrow','yesterday','now','later','soon','here','there','where','when',
  'why','how','what','who','which','some','any','all','more','most','less',
  'much','many','few','little','good','bad','best','great','nice','cool',
  'hot','cold','new','old','big','small','high','low','long','short','same',
  'different','easy','hard','fun','sad','happy','okay','ok','yes','no','not',
  // common chat verbs + slang
  'go','going','went','gone','come','came','coming','get','got','getting',
  'see','saw','seen','seeing','know','knew','known','knowing','think',
  'thought','thinking','say','said','saying','tell','told','telling','make',
  'made','making','take','took','taken','taking','want','wanted','wanting',
  'like','liked','liking','love','loved','loving','need','needed','needing',
  'try','tried','trying','work','worked','working','play','played','playing',
  'find','found','finding','feel','felt','feeling','look','looked','looking',
  'send','sent','sending','call','called','calling','meet','met','meeting',
  'eat','ate','eaten','eating','sleep','slept','sleeping','run','ran','running',
  'help','helped','helping','start','started','starting','stop','stopped',
  'stopping','give','gave','given','giving','use','used','using','show',
  'showed','shown','showing','bring','brought','bringing',
  // contractions
  "don't","can't","won't","it's","i'm","you're","we're","they're","isn't",
  "aren't","wasn't","weren't","i'll","i've","i'd","you've","you'll","that's",
  "there's","here's","what's","let's","didn't","doesn't","hasn't","haven't",
  "hadn't","wouldn't","couldn't","shouldn't",
  // common chat
  'hi','hey','hello','hii','yo','sup','yeah','yep','yup','nope','nah','sure',
  'thanks','thx','ty','please','sorry','plz','bye','later','cool','nice',
  // common Hinglish/code-mix tokens (so multilingual users don't tank typoRate)
  'yaar','bhai','kya','scene','accha','hai','ho','kar','lo','de','na','re',
  'aur','bhi','toh','phir','kuch','kyun','kaisa','kaise','main','mein','tum',
  'tu','aap','epdi','iruka','sema','da','khabor','bolish','kotha','tora',
  'mera','meri','tera','teri','wala','wali',
]);

// because: contraction pairs for §1.5 F1.7 contraction rate formula
const CONTRACTION_PAIRS: ReadonlyArray<[string, string]> = [
  ["don't", "do not"],
  ["can't", "cannot"],
  ["won't", "will not"],
  ["it's", "it is"],
  ["i'm", "i am"],
  ["you're", "you are"],
  ["we're", "we are"],
  ["they're", "they are"],
  ["isn't", "is not"],
  ["aren't", "are not"],
  ["wasn't", "was not"],
  ["weren't", "were not"],
  ["i'll", "i will"],
  ["i've", "i have"],
  ["i'd", "i would"],
];

// because: laugh-token regex per §1.5 F1.8; matches lol/haha+/lmao/hehe+/rofl
const LAUGH_REGEX = /\b(lol|haha+|lmao+|hehe+|rofl)\b/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  // because: §1.5 F1.2 — no interpolation, integer outputs for debuggability
  return sorted[Math.floor(sorted.length * 0.5)];
}

function tokens(content: string): string[] {
  // because: cheap word-tokenizer; strip punctuation, lowercase for dict match
  return content.toLowerCase().match(/[a-z']+/g) ?? [];
}

function countMatches(s: string, re: RegExp): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

function countSubstr(s: string, sub: string): number {
  if (!sub) return 0;
  let i = 0;
  let n = 0;
  while ((i = s.indexOf(sub, i)) !== -1) {
    n++;
    i += sub.length;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export function extractSenderVoice(samples: OutboundMessageSample[]): SenderVoiceVector {
  // because: §1.8 — below floor return neutral; we don't impose unobserved habits
  if (!samples || samples.length < MIN_SAMPLES) {
    return {
      ...NEUTRAL_VOICE,
      sampleCount: samples?.length ?? 0,
      confidence: clip01((samples?.length ?? 0) / SAMPLE_TARGET),
    };
  }

  // because: bound to last MAX_SAMPLES (most-recent slice — caller sends DESC order)
  const slice = samples.slice(0, MAX_SAMPLES);
  const n = slice.length;

  const lensChars: number[] = [];
  const lensWords: number[] = [];
  let emojiBearing = 0;
  let totalEmojis = 0;
  const emojiCounts = new Map<string, number>();
  let emDashCount = 0;
  let exclamationCount = 0;
  let questionCount = 0;
  let commaCount = 0;
  let wordCount = 0;
  let fragmentsTotal = 0;
  let lowercaseIOcc = 0;
  let totalIOcc = 0;
  let lowercaseStartCount = 0;
  let unknownWords = 0;
  let contractionCount = 0;
  let expansionCount = 0;
  let laughCount = 0;
  let typedWords = 0;

  for (const s of slice) {
    const c = s.content ?? '';
    lensChars.push(c.length);

    const words = tokens(c);
    lensWords.push(words.length);
    wordCount += words.length;

    // because: §1.5 F1.3 — emoji-bearing rate, plus per-emoji frequency for topEmojis
    const emMatches = c.match(EMOJI_REGEX) ?? [];
    if (emMatches.length > 0) emojiBearing++;
    totalEmojis += emMatches.length;
    for (const e of emMatches) emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);

    // because: em-dash + double-hyphen both count per §1.3
    emDashCount += countSubstr(c, '—') + countSubstr(c, '--');

    exclamationCount += countMatches(c, /!/g);
    questionCount += countMatches(c, /\?/g);
    commaCount += countMatches(c, /,/g);

    // because: §1.5 F1.4 — fragment = piece with 1..2 words
    const pieces = c.split(/[.!?]+/).map((p) => p.trim()).filter((p) => p.length > 0);
    for (const p of pieces) {
      const w = (p.match(/\S+/g) ?? []).length;
      if (w > 0 && w < 3) fragmentsTotal++;
    }

    // because: §1.5 F1.5 — lowercaseIRate = standalone lowercase 'i' / all 1p sing
    const lowerI = countMatches(c, /(^|\s)i(\s|$)/g);
    const upperI = countMatches(c, /(^|\s)I(\s|$)/g);
    lowercaseIOcc += lowerI;
    totalIOcc += lowerI + upperI;

    // because: §1.3 — first non-whitespace char lowercase letter
    const firstChar = c.trim().charAt(0);
    if (firstChar && firstChar >= 'a' && firstChar <= 'z') lowercaseStartCount++;

    // because: typo proxy — dictionary miss rate over typed words
    for (const w of words) {
      typedWords++;
      if (!COMMON_DICT.has(w)) unknownWords++;
    }

    // because: §1.5 F1.7 — contraction rate counts both forms in lowered content
    const lower = c.toLowerCase();
    for (const [con, exp] of CONTRACTION_PAIRS) {
      contractionCount += countSubstr(lower, con);
      expansionCount += countSubstr(lower, exp);
    }

    // because: §1.5 F1.8
    laughCount += (c.match(LAUGH_REGEX) ?? []).length;
  }

  // because: top-3 by count, deterministic tie-break by Unicode code point
  const topEmojis = Array.from(emojiCounts.entries())
    .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
    .slice(0, 3)
    .map(([e]) => e);

  const totalContractions = contractionCount + expansionCount;

  return {
    medianLengthChars: median(lensChars),
    medianLengthWords: median(lensWords),
    emojiRate: totalEmojis / n,
    topEmojis,
    emDashRate: emDashCount / n,
    exclamationRate: exclamationCount / n,
    questionRate: questionCount / n,
    commaPerWord: wordCount > 0 ? commaCount / wordCount : 0,
    fragmentsPerMessage: fragmentsTotal / n,
    lowercaseIRate: totalIOcc > 0 ? lowercaseIOcc / totalIOcc : NEUTRAL_VOICE.lowercaseIRate,
    lowercaseStartRate: lowercaseStartCount / n,
    typoRateApprox: typedWords > 0 ? unknownWords / typedWords : 0,
    contractionRate: totalContractions > 0 ? contractionCount / totalContractions : NEUTRAL_VOICE.contractionRate,
    laughTokenRate: laughCount / n,
    sampleCount: n,
    confidence: clip01(n / SAMPLE_TARGET),
  };
}

// ---------------------------------------------------------------------------
// projectToVoice — sender-habit post-processor (Section 5.6 F5.2)
// ---------------------------------------------------------------------------

// because: §5.4 — even at low confidence apply *some* habit projection;
// fully neutral output would read as v3
export const POST_PROC_STRENGTH_FLOOR = 0.3;

/** Apply the sender's voice habits onto a freshly-rendered template. */
export function projectToVoice(rendered: string, voice: SenderVoiceVector): string {
  if (!rendered) return rendered;

  // because: scale projection by observed confidence — never <30%
  const strength = Math.max(voice.confidence, POST_PROC_STRENGTH_FLOOR);

  let line = rendered;

  // 2. Lowercase project: if sender starts lowercase >50%, lowercase first char
  // (apply only when strength is meaningful — gate by 0.5 to avoid forcing
  // habits we barely saw)
  if (voice.lowercaseStartRate * strength > 0.4) {
    const first = line.charAt(0);
    if (first >= 'A' && first <= 'Z') {
      line = first.toLowerCase() + line.slice(1);
    }
  }

  // 3. Contraction project: if sender contracts >70%, swap expansions in
  if (voice.contractionRate * strength > 0.5) {
    for (const [con, exp] of CONTRACTION_PAIRS) {
      // because: case-insensitive replace; preserve word boundaries
      const re = new RegExp(`\\b${exp.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'gi');
      line = line.replace(re, con);
    }
  }

  // 4. Exclamation project — strip trailing ! when sender almost never uses them
  if (voice.exclamationRate < 0.05 && line.endsWith('!')) {
    line = line.replace(/!+$/, '');
  }

  // 1. Length project — if rendered > 1.2× sender's median chars by big margin,
  // trim trailing clause at last sentence boundary (do not pad short outputs).
  // because: §5.6 step 1
  const targetMax = Math.max(40, Math.floor(voice.medianLengthChars * 1.8));
  if (line.length > targetMax) {
    // find a sentence boundary (period/question/exclamation) before the cap
    const cut = line.slice(0, targetMax).lastIndexOf('.');
    if (cut > 10) line = line.slice(0, cut);
  }

  return line;
}

// because: exported for fingerprint UI + tests
export const __test__ = {
  median,
  tokens,
  COMMON_DICT,
  CONTRACTION_PAIRS,
  EMOJI_REGEX,
  LAUGH_REGEX,
};
