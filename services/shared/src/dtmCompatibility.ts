// ─── v3.2 DTM Compatibility ────────────────────────────────────
// Pure, deterministic compatibility score between two MatrimonialProfiles.
// Symmetric: scores "my partner prefs vs their profile" AND
//            "their partner prefs vs my profile", averages the two.
//
// Returns a 0–100 score plus a per-axis breakdown the UI can render as
// rows ("Religion · match", "Income · 80%", etc).
//
// Kept dependency-free (no Prisma, no React). Callers pass the two raw
// MatrimonialProfile objects (PII redaction is the caller's job — pass
// the unredacted rows here).

export interface CompatibilityAxis {
  key: string;
  label: string;
  weight: number;        // contributes to overall (sum of weights = 100)
  score: number;         // 0..100 on this axis (symmetric average)
  note?: string;         // optional human explanation for the UI
}

export interface CompatibilityResult {
  overall: number;       // 0..100 weighted average
  axes: CompatibilityAxis[];
  hardBlockers: string[]; // axes that hit 0 and represent a deal-breaker (e.g. age out of range)
}

// ─── helpers ──────────────────────────────────────────────────
const norm = (s: any) => (s ?? '').toString().trim().toLowerCase();
const eq = (a: any, b: any) => norm(a) && norm(a) === norm(b);
const empty = (v: any) => v === undefined || v === null || v === '' || v === 0;

const INCOME_ORDER = ['<5L','5-10L','10-20L','20-35L','35-50L','50-75L','75L-1Cr','1Cr+'];
function incomeIdx(s: string): number { const i = INCOME_ORDER.indexOf(s); return i < 0 ? -1 : i; }
function incomeMeets(pref: string, theirs: string): number {
  // "min" semantics: their income should be ≥ what I want.
  // Treat empty pref as 'no preference' → full score.
  if (empty(pref) || norm(pref) === 'any') return 100;
  const w = incomeIdx(pref), t = incomeIdx(theirs);
  if (t < 0) return 50; // they haven't disclosed → 50
  if (t >= w) return 100;
  // partial credit, 25 pts per band shortfall
  return Math.max(0, 100 - (w - t) * 25);
}

const EDUCATION_ORDER = ['High School','Diploma',"Bachelor's",'Bachelor\u2019s+',"Master's",'Master\u2019s+','PhD','Professional'];
function eduIdx(s: string): number {
  const n = norm(s);
  for (let i = 0; i < EDUCATION_ORDER.length; i++) if (norm(EDUCATION_ORDER[i]) === n) return i;
  return -1;
}
function eduMeets(pref: string, theirs: string): number {
  if (empty(pref) || norm(pref) === 'any') return 100;
  const w = eduIdx(pref), t = eduIdx(theirs);
  if (w < 0 || t < 0) return 60; // can't compare → neutral
  if (t >= w) return 100;
  return Math.max(0, 100 - (w - t) * 30);
}

function ageMeets(min: number, max: number, age: number): number {
  if (!min || !max) return 100;
  if (!age) return 50;
  if (age >= min && age <= max) return 100;
  // 10-pt drop per year outside, capped
  const dist = age < min ? min - age : age - max;
  return Math.max(0, 100 - dist * 10);
}

function heightInches(s: string): number {
  const m = (s ?? '').toString().match(/(\d+)'(\d+)?/);
  if (!m) return 0;
  return parseInt(m[1]) * 12 + (parseInt(m[2] || '0') || 0);
}
function heightMeets(min: string, max: string, theirs: string): number {
  if (empty(min) && empty(max)) return 100;
  const h = heightInches(theirs);
  const lo = empty(min) ? 0 : heightInches(min);
  const hi = empty(max) ? 999 : heightInches(max);
  if (!h) return 50;
  if (h >= lo && h <= hi) return 100;
  const dist = h < lo ? lo - h : h - hi;
  return Math.max(0, 100 - dist * 12);
}

function setMeets(prefCsv: string, theirsCsv: string): number {
  if (empty(prefCsv) || norm(prefCsv) === 'any') return 100;
  const want = norm(prefCsv).split(',').map((s: string) => s.trim()).filter(Boolean);
  const got = norm(theirsCsv).split(',').map((s: string) => s.trim()).filter(Boolean);
  if (!want.length) return 100;
  if (!got.length) return 50;
  // any overlap = full credit; otherwise scale by closeness
  return want.some((w: string) => got.includes(w)) ? 100 : 0;
}

function strictMeets(pref: string, theirs: string): number {
  if (empty(pref) || norm(pref) === 'any') return 100;
  if (empty(theirs)) return 50;
  return eq(pref, theirs) ? 100 : 0;
}

function softMeets(pref: string, theirs: string): number {
  // for lifestyle (smoking/drinking): a softer "match"
  if (empty(pref) || norm(pref) === 'any') return 100;
  if (empty(theirs)) return 50;
  if (eq(pref, theirs)) return 100;
  // adjacent tolerances → 60
  const adjacent: Record<string, string[]> = {
    no: ['never','rarely'],
    never: ['no','rarely'],
    rarely: ['socially','never','no'],
    socially: ['rarely','often'],
    often: ['socially'],
  };
  const p = norm(pref); const t = norm(theirs);
  if (adjacent[p]?.includes(t)) return 60;
  return 20;
}

function manglikMeets(pref: string, theirs: string): number {
  if (empty(pref) || norm(pref).startsWith('don')) return 100;
  if (eq(pref, theirs)) return 100;
  // mutual manglik (both yes) is traditionally OK
  if (eq(pref, 'yes') && eq(theirs, 'yes')) return 100;
  return 0;
}

// ─── one-direction score: "viewer's prefs" vs "candidate's profile" ──
interface DirInput {
  prefs: any;           // partner* fields of the viewer
  themProfile: any;     // candidate MatrimonialProfile
  themAge?: number;     // candidate's age (from inherited Profile)
}
function scoreOneDirection({ prefs, themProfile, themAge }: DirInput): CompatibilityAxis[] {
  const t = themProfile ?? {};
  return [
    { key: 'age',         label: 'Age range',         weight: 10, score: ageMeets(prefs.partnerAgeMin, prefs.partnerAgeMax, themAge ?? 0) },
    { key: 'height',      label: 'Height',            weight: 6,  score: heightMeets(prefs.partnerHeightMin, prefs.partnerHeightMax, t.height) },
    { key: 'religion',    label: 'Religion',          weight: 10, score: strictMeets(prefs.partnerReligion, t.religion) },
    { key: 'caste',       label: 'Caste / community', weight: 6,  score: strictMeets(prefs.partnerCaste, t.caste) },
    { key: 'manglik',     label: 'Manglik',           weight: 4,  score: manglikMeets(prefs.partnerManglik, t.manglik) },
    { key: 'motherTongue',label: 'Mother tongue',     weight: 4,  score: strictMeets(prefs.partnerMotherTongue, t.motherTongue) },
    { key: 'marital',     label: 'Marital status',    weight: 8,  score: strictMeets(prefs.partnerMaritalStatus, t.maritalStatus) },
    { key: 'education',   label: 'Education',         weight: 8,  score: eduMeets(prefs.partnerEducation, t.education) },
    { key: 'occupation',  label: 'Occupation',        weight: 6,  score: strictMeets(prefs.partnerOccupation, t.occupation) },
    { key: 'income',      label: 'Income',            weight: 10, score: incomeMeets(prefs.partnerIncome, t.annualIncome) },
    { key: 'diet',        label: 'Diet',              weight: 6,  score: softMeets(prefs.partnerDiet, t.diet) },
    { key: 'smoking',     label: 'Smoking',           weight: 4,  score: softMeets(prefs.partnerSmoking, t.smoking) },
    { key: 'drinking',    label: 'Drinking',          weight: 4,  score: softMeets(prefs.partnerDrinking, t.drinking) },
    { key: 'familyType',  label: 'Family type',       weight: 4,  score: strictMeets(prefs.partnerFamilyType, t.familyType) },
    { key: 'familyValues',label: 'Family values',     weight: 4,  score: strictMeets(prefs.partnerFamilyValues, t.familyValues) },
    { key: 'location',    label: 'Preferred location',weight: 6,  score: setMeets(prefs.partnerLocations || prefs.partnerCity, t.workingCity) },
    // partnerRelocate / partnerChildren are tracked but not yet scored
  ];
}

// ─── public API ───────────────────────────────────────────────
export interface ComputeArgs {
  mine: any;           // MatrimonialProfile of the viewer
  myAge?: number;
  theirs: any;         // MatrimonialProfile of the candidate
  theirAge?: number;
}
export function computeDtmCompatibility({ mine, myAge, theirs, theirAge }: ComputeArgs): CompatibilityResult {
  const fwd = scoreOneDirection({ prefs: mine ?? {}, themProfile: theirs ?? {}, themAge: theirAge });
  const rev = scoreOneDirection({ prefs: theirs ?? {}, themProfile: mine ?? {}, themAge: myAge });
  // Average the two directions per axis
  const axes: CompatibilityAxis[] = fwd.map((a, i) => ({
    key: a.key,
    label: a.label,
    weight: a.weight,
    score: Math.round((a.score + rev[i].score) / 2),
  }));
  const totalW = axes.reduce((s, a) => s + a.weight, 0);
  const weighted = axes.reduce((s, a) => s + a.score * a.weight, 0);
  const overall = Math.round(weighted / totalW);
  // hardBlockers are axes where EITHER direction had a zero — surface to UI even
  // when the symmetric average masks a true incompatibility.
  const fwdKeys = new Set(fwd.filter(a => a.score === 0 && ['religion','marital','age'].includes(a.key)).map(a => a.key));
  const revKeys = new Set(rev.filter(a => a.score === 0 && ['religion','marital','age'].includes(a.key)).map(a => a.key));
  const blockerKeys = new Set([...fwdKeys, ...revKeys]);
  const hardBlockers = axes.filter(a => blockerKeys.has(a.key)).map(a => a.label);
  return { overall, axes, hardBlockers };
}
