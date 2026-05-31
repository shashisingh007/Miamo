export type ConsentScope =
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'functional'
  | 'sale_share';

export type ConsentRecord = {
  readonly scope: ConsentScope;
  readonly granted: boolean;
  readonly tsMs: number;
};

export type ConsentEvaluationResult = {
  readonly allowed: boolean;
  readonly reason:
    | 'granted'
    | 'denied'
    | 'expired'
    | 'never_set'
    | 'revoked'
    | 'always_required';
  readonly latestTsMs: number | null;
};

export type ConsentOptions = {
  readonly ttlMs?: number;       // 0 / undefined = no expiry
  readonly nowMs: number;
};

const ALWAYS_ALLOWED: ReadonlySet<ConsentScope> = new Set(['functional']);

function latest(records: ReadonlyArray<ConsentRecord>, scope: ConsentScope): ConsentRecord | null {
  let best: ConsentRecord | null = null;
  for (const r of records) {
    if (!r || r.scope !== scope) continue;
    if (!Number.isFinite(r.tsMs)) continue;
    if (!best || r.tsMs > best.tsMs) best = r;
  }
  return best;
}

export function evaluateConsent(
  records: ReadonlyArray<ConsentRecord>,
  scope: ConsentScope,
  opts: ConsentOptions,
): ConsentEvaluationResult {
  if (ALWAYS_ALLOWED.has(scope)) {
    const r = latest(records, scope);
    return { allowed: true, reason: 'always_required', latestTsMs: r?.tsMs ?? null };
  }
  const r = latest(records, scope);
  if (!r) return { allowed: false, reason: 'never_set', latestTsMs: null };

  const ttl = opts.ttlMs ?? 0;
  if (ttl > 0 && opts.nowMs - r.tsMs > ttl) {
    return { allowed: false, reason: 'expired', latestTsMs: r.tsMs };
  }
  if (r.granted) return { allowed: true, reason: 'granted', latestTsMs: r.tsMs };

  // not granted: distinguish revoked vs never granted
  let everGranted = false;
  for (const rec of records) {
    if (rec && rec.scope === scope && rec.granted) {
      everGranted = true;
      break;
    }
  }
  return {
    allowed: false,
    reason: everGranted ? 'revoked' : 'denied',
    latestTsMs: r.tsMs,
  };
}

export function summarizeConsent(
  records: ReadonlyArray<ConsentRecord>,
  opts: ConsentOptions,
): Record<ConsentScope, ConsentEvaluationResult> {
  const scopes: ConsentScope[] = [
    'analytics',
    'marketing',
    'personalization',
    'functional',
    'sale_share',
  ];
  const out = {} as Record<ConsentScope, ConsentEvaluationResult>;
  for (const s of scopes) out[s] = evaluateConsent(records, s, opts);
  return out;
}
