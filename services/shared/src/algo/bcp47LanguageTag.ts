export type Bcp47ParsedTag = {
  readonly language: string;
  readonly script: string | null;
  readonly region: string | null;
  readonly variants: ReadonlyArray<string>;
  readonly normalized: string;
};

const LANG_RE = /^[a-z]{2,3}$/i;
const SCRIPT_RE = /^[a-z]{4}$/i;
const REGION_RE = /^([a-z]{2}|\d{3})$/i;
const VARIANT_RE = /^([a-z0-9]{5,8}|\d[a-z0-9]{3})$/i;

export function parseBcp47(input: unknown): Bcp47ParsedTag | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split('-');
  if (parts.length === 0) return null;
  const lang = parts[0];
  if (!LANG_RE.test(lang)) return null;
  let i = 1;
  let script: string | null = null;
  if (i < parts.length && SCRIPT_RE.test(parts[i])) {
    script = parts[i];
    i++;
  }
  let region: string | null = null;
  if (i < parts.length && REGION_RE.test(parts[i])) {
    region = parts[i];
    i++;
  }
  const variants: string[] = [];
  while (i < parts.length) {
    const p = parts[i];
    if (!VARIANT_RE.test(p)) return null;
    variants.push(p.toLowerCase());
    i++;
  }
  const normLang = lang.toLowerCase();
  const normScript = script ? script[0].toUpperCase() + script.slice(1).toLowerCase() : null;
  const normRegion = region ? region.toUpperCase() : null;
  const segments: string[] = [normLang];
  if (normScript) segments.push(normScript);
  if (normRegion) segments.push(normRegion);
  for (const v of variants) segments.push(v);
  return {
    language: normLang,
    script: normScript,
    region: normRegion,
    variants,
    normalized: segments.join('-'),
  };
}

export function matchBcp47(
  desired: Bcp47ParsedTag,
  offered: ReadonlyArray<Bcp47ParsedTag>,
): Bcp47ParsedTag | null {
  // 1. exact normalized match
  const exact = offered.find((o) => o.normalized === desired.normalized);
  if (exact) return exact;
  // 2. language + region match
  if (desired.region) {
    const lr = offered.find(
      (o) => o.language === desired.language && o.region === desired.region,
    );
    if (lr) return lr;
  }
  // 3. language-only match
  const lang = offered.find((o) => o.language === desired.language);
  return lang ?? null;
}
