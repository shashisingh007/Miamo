/**
 * cspBuilder \u2014 Phase 20 OWASP A05 Content-Security-Policy header (pure).
 *
 * Builds a CSP string from a typed directive bag. Per-directive sources
 * are deduped and sorted so the header is byte-stable across deploys
 * (important for ETag-on-headers caches & diff review).
 */
export type CspDirectives = {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  objectSrc?: string[];
  reportUri?: string;
};

const KEYWORDS = new Set([
  "'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'",
  "'report-sample'", "'wasm-unsafe-eval'",
]);

const SCHEME_RE = /^[a-z][a-z0-9+\-.]*:$/i;
const HOST_RE = /^[*A-Za-z0-9.\-:_/]+$/;

function isValidSource(src: string): boolean {
  if (KEYWORDS.has(src)) return true;
  if (src.startsWith("'nonce-") && src.endsWith("'") && src.length > 9) return true;
  if (src.startsWith("'sha256-") && src.endsWith("'")) return true;
  if (src.startsWith("'sha384-") && src.endsWith("'")) return true;
  if (src.startsWith("'sha512-") && src.endsWith("'")) return true;
  if (SCHEME_RE.test(src)) return true;
  if (HOST_RE.test(src) && !src.includes(' ')) return true;
  return false;
}

function normSources(srcs: string[] | undefined): string[] | null {
  if (!srcs || !srcs.length) return null;
  const out = new Set<string>();
  for (const s of srcs) {
    if (typeof s === 'string' && isValidSource(s)) out.add(s);
  }
  if (!out.size) return null;
  return [...out].sort();
}

const ORDER: Array<[keyof CspDirectives, string]> = [
  ['defaultSrc', 'default-src'],
  ['scriptSrc', 'script-src'],
  ['styleSrc', 'style-src'],
  ['imgSrc', 'img-src'],
  ['connectSrc', 'connect-src'],
  ['fontSrc', 'font-src'],
  ['objectSrc', 'object-src'],
  ['baseUri', 'base-uri'],
  ['formAction', 'form-action'],
  ['frameAncestors', 'frame-ancestors'],
];

export function buildCsp(directives: CspDirectives): string {
  const parts: string[] = [];
  for (const [key, name] of ORDER) {
    const srcs = normSources(directives[key] as string[] | undefined);
    if (srcs) parts.push(`${name} ${srcs.join(' ')}`);
  }
  if (typeof directives.reportUri === 'string' && /^https?:\/\//.test(directives.reportUri)) {
    parts.push(`report-uri ${directives.reportUri}`);
  }
  return parts.join('; ');
}

/** Sensible secure default for the Miamo web tier. */
export function defaultMiamoCsp(): string {
  return buildCsp({
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // tailwind inline styles
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  });
}
