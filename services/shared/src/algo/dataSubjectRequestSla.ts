export type DataSubjectRequestKind = 'access' | 'erasure' | 'rectification' | 'portability';
export type DataSubjectRequestStatus =
  | 'received'
  | 'verifying'
  | 'in_progress'
  | 'fulfilled'
  | 'rejected';

export type DataSubjectRequest = {
  readonly id: string;
  readonly kind: DataSubjectRequestKind;
  readonly status: DataSubjectRequestStatus;
  readonly receivedAtMs: number;
  readonly verifiedAtMs?: number;
  readonly fulfilledAtMs?: number;
};

export type DataSubjectRequestEvaluation = {
  readonly id: string;
  readonly slaMs: number;
  readonly remainingMs: number;
  readonly state: 'on_time' | 'due_soon' | 'overdue' | 'closed';
  readonly nextAction: 'verify' | 'fulfil' | 'wait' | 'none';
};

const SLA_BY_KIND: Record<DataSubjectRequestKind, number> = {
  access: 30 * 24 * 60 * 60 * 1000,
  erasure: 30 * 24 * 60 * 60 * 1000,
  rectification: 30 * 24 * 60 * 60 * 1000,
  portability: 30 * 24 * 60 * 60 * 1000,
};

const DUE_SOON_FRACTION = 0.25;

export function evaluateDataSubjectRequest(
  req: DataSubjectRequest,
  nowMs: number,
): DataSubjectRequestEvaluation {
  const slaMs = SLA_BY_KIND[req.kind];
  const elapsed = Math.max(0, nowMs - req.receivedAtMs);
  const remaining = slaMs - elapsed;

  let state: DataSubjectRequestEvaluation['state'];
  let nextAction: DataSubjectRequestEvaluation['nextAction'];

  if (req.status === 'fulfilled' || req.status === 'rejected') {
    state = 'closed';
    nextAction = 'none';
  } else {
    if (remaining <= 0) state = 'overdue';
    else if (remaining <= slaMs * DUE_SOON_FRACTION) state = 'due_soon';
    else state = 'on_time';

    if (req.status === 'received' || !req.verifiedAtMs) nextAction = 'verify';
    else if (req.status === 'verifying') nextAction = 'verify';
    else if (req.status === 'in_progress') nextAction = 'fulfil';
    else nextAction = 'wait';
  }

  return {
    id: req.id,
    slaMs,
    remainingMs: Math.max(0, remaining),
    state,
    nextAction,
  };
}

export function summarizeDataSubjectRequests(
  requests: ReadonlyArray<DataSubjectRequest>,
  nowMs: number,
): {
  overdue: number;
  dueSoon: number;
  onTime: number;
  closed: number;
} {
  let overdue = 0, dueSoon = 0, onTime = 0, closed = 0;
  for (const r of requests) {
    const e = evaluateDataSubjectRequest(r, nowMs);
    if (e.state === 'overdue') overdue++;
    else if (e.state === 'due_soon') dueSoon++;
    else if (e.state === 'on_time') onTime++;
    else closed++;
  }
  return { overdue, dueSoon, onTime, closed };
}
