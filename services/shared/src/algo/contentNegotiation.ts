export type ContentNegotiationOffer = {
  readonly type: string;
  readonly q?: number;
};

export type ContentNegotiationResult = {
  readonly type: string | null;
  readonly q: number;
};

type ParsedAccept = { type: string; q: number; specificity: number };

function parseAccept(header: string): ParsedAccept[] {
  const parts = header.split(',').map((s) => s.trim()).filter(Boolean);
  const out: ParsedAccept[] = [];
  for (const part of parts) {
    const [rawType, ...params] = part.split(';').map((s) => s.trim());
    if (!rawType) continue;
    const type = rawType.toLowerCase();
    let q = 1;
    for (const p of params) {
      const m = /^q=([0-9.]+)$/i.exec(p);
      if (m) {
        const n = Number.parseFloat(m[1]);
        if (Number.isFinite(n) && n >= 0 && n <= 1) q = n;
      }
    }
    const slash = type.indexOf('/');
    let specificity = 0;
    if (slash >= 0) {
      const left = type.slice(0, slash);
      const right = type.slice(slash + 1);
      if (left !== '*') specificity += 2;
      if (right !== '*') specificity += 1;
    } else {
      specificity = type === '*' ? 0 : 3;
    }
    out.push({ type, q, specificity });
  }
  return out;
}

function matches(offerType: string, acceptType: string): boolean {
  if (acceptType === '*/*' || acceptType === '*') return true;
  if (offerType === acceptType) return true;
  const i = acceptType.indexOf('/');
  if (i < 0) return false;
  const left = acceptType.slice(0, i);
  const right = acceptType.slice(i + 1);
  const j = offerType.indexOf('/');
  if (j < 0) return false;
  const oLeft = offerType.slice(0, j);
  const oRight = offerType.slice(j + 1);
  if (right === '*' && left === oLeft) return true;
  if (left === '*' && right === oRight) return true;
  return false;
}

export function negotiateContentType(
  acceptHeader: string | null | undefined,
  offers: ReadonlyArray<ContentNegotiationOffer>,
): ContentNegotiationResult {
  const normOffers = offers
    .filter((o) => o && typeof o.type === 'string' && o.type.length > 0)
    .map((o) => ({ type: o.type.toLowerCase(), q: typeof o.q === 'number' && o.q >= 0 && o.q <= 1 ? o.q : 1 }));
  if (normOffers.length === 0) return { type: null, q: 0 };

  if (!acceptHeader || typeof acceptHeader !== 'string' || acceptHeader.trim().length === 0) {
    const first = normOffers[0];
    return { type: first.type, q: first.q };
  }

  const accepts = parseAccept(acceptHeader);
  if (accepts.length === 0) {
    const first = normOffers[0];
    return { type: first.type, q: first.q };
  }

  let best: { type: string; score: number; q: number } | null = null;
  for (let i = 0; i < normOffers.length; i++) {
    const offer = normOffers[i];
    // RFC 7231: the most specific matching media range determines q.
    let chosen: ParsedAccept | null = null;
    for (const a of accepts) {
      if (!matches(offer.type, a.type)) continue;
      if (!chosen || a.specificity > chosen.specificity) chosen = a;
    }
    if (!chosen) continue;
    if (chosen.q <= 0) continue;
    const effectiveQ = chosen.q * offer.q;
    if (effectiveQ <= 0) continue;
    const score = effectiveQ * 100 + chosen.specificity - i * 0.001;
    if (!best || score > best.score) {
      best = { type: offer.type, score, q: effectiveQ };
    }
  }

  if (!best) return { type: null, q: 0 };
  return { type: best.type, q: best.q };
}
