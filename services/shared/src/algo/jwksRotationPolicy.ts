export type JwksKey = {
  readonly kid: string;
  readonly alg?: string;
  readonly kty?: string;
  readonly [k: string]: unknown;
};

export type JwksRotationDecision =
  | { rotated: false; reason: 'no_change' | 'kid_mismatch_safe' }
  | {
      rotated: true;
      added: ReadonlyArray<string>;
      removed: ReadonlyArray<string>;
      replaced: boolean;
    };

export type JwksRotationInput = {
  current: ReadonlyArray<JwksKey>;
  incoming: ReadonlyArray<JwksKey>;
  activeKid?: string;
};

function dedupeByKid(keys: ReadonlyArray<JwksKey>): JwksKey[] {
  const seen = new Set<string>();
  const out: JwksKey[] = [];
  for (const k of keys) {
    if (!k || typeof k.kid !== 'string' || k.kid.length === 0) continue;
    if (seen.has(k.kid)) continue;
    seen.add(k.kid);
    out.push(k);
  }
  return out;
}

function kidSet(keys: ReadonlyArray<JwksKey>): Set<string> {
  const s = new Set<string>();
  for (const k of keys) s.add(k.kid);
  return s;
}

export function decideJwksRotation(input: JwksRotationInput): JwksRotationDecision {
  const cur = dedupeByKid(input.current);
  const inc = dedupeByKid(input.incoming);
  const curSet = kidSet(cur);
  const incSet = kidSet(inc);

  if (inc.length === 0) {
    return { rotated: false, reason: 'no_change' };
  }

  const added: string[] = [];
  for (const k of inc) if (!curSet.has(k.kid)) added.push(k.kid);
  const removed: string[] = [];
  for (const k of cur) if (!incSet.has(k.kid)) removed.push(k.kid);

  if (added.length === 0 && removed.length === 0) {
    return { rotated: false, reason: 'no_change' };
  }

  if (input.activeKid && !incSet.has(input.activeKid)) {
    return { rotated: false, reason: 'kid_mismatch_safe' };
  }

  return {
    rotated: true,
    added,
    removed,
    replaced: added.length > 0 && removed.length > 0,
  };
}

export function mergeJwksRetainActive(
  input: JwksRotationInput,
): ReadonlyArray<JwksKey> {
  const inc = dedupeByKid(input.incoming);
  if (!input.activeKid) return inc;
  const incSet = kidSet(inc);
  if (incSet.has(input.activeKid)) return inc;
  const active = input.current.find((k) => k.kid === input.activeKid);
  if (!active) return inc;
  return [active, ...inc];
}
