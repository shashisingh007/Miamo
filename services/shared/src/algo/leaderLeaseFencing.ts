export type LeaderLeaseRecord = {
  readonly holderId: string;
  readonly acquiredAtMs: number;
  readonly expiresAtMs: number;
  readonly fencingToken: number;
};

export type LeaderLeaseDecision =
  | { ok: true; record: LeaderLeaseRecord; renewed: boolean }
  | { ok: false; reason: 'held_by_other' | 'expired' | 'unknown_holder'; record?: LeaderLeaseRecord };

export type LeaderLeaseAcquireInput = {
  current: LeaderLeaseRecord | null;
  candidateId: string;
  nowMs: number;
  ttlMs: number;
};

export type LeaderLeaseRenewInput = {
  current: LeaderLeaseRecord | null;
  holderId: string;
  nowMs: number;
  ttlMs: number;
};

function clean(n: number, min = 0): number {
  return Number.isFinite(n) && n >= min ? Math.floor(n) : min;
}

export function tryAcquireLeaderLease(input: LeaderLeaseAcquireInput): LeaderLeaseDecision {
  const now = clean(input.nowMs);
  const ttl = Math.max(1, clean(input.ttlMs, 1));
  const cur = input.current;
  if (cur && now < cur.expiresAtMs && cur.holderId !== input.candidateId) {
    return { ok: false, reason: 'held_by_other', record: cur };
  }
  const nextToken = (cur?.fencingToken ?? 0) + 1;
  const record: LeaderLeaseRecord = {
    holderId: input.candidateId,
    acquiredAtMs: now,
    expiresAtMs: now + ttl,
    fencingToken: nextToken,
  };
  return { ok: true, record, renewed: false };
}

export function tryRenewLeaderLease(input: LeaderLeaseRenewInput): LeaderLeaseDecision {
  const now = clean(input.nowMs);
  const ttl = Math.max(1, clean(input.ttlMs, 1));
  const cur = input.current;
  if (!cur) return { ok: false, reason: 'unknown_holder' };
  if (cur.holderId !== input.holderId) {
    return { ok: false, reason: 'held_by_other', record: cur };
  }
  if (now >= cur.expiresAtMs) {
    return { ok: false, reason: 'expired', record: cur };
  }
  const record: LeaderLeaseRecord = {
    holderId: cur.holderId,
    acquiredAtMs: cur.acquiredAtMs,
    expiresAtMs: now + ttl,
    fencingToken: cur.fencingToken,
  };
  return { ok: true, record, renewed: true };
}

export function isFencingTokenStale(
  observed: number,
  highestSeen: number,
): boolean {
  return observed < highestSeen;
}
