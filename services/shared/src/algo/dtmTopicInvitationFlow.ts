import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type InvitationSignal =
  | 'open-invitation'
  | 'invited'
  | 'cool-allowed'
  | 'gated'
  | 'closed-out';

export interface InvitationEvent {
  topic: string;
  signal: InvitationSignal;
}

const WEIGHTS: Record<InvitationSignal, number> = {
  'open-invitation': 1,
  invited: 0.8,
  'cool-allowed': 0.55,
  gated: 0.25,
  'closed-out': 0,
};

export type InvitationBand =
  | 'closed'
  | 'gated'
  | 'allowed'
  | 'invited'
  | 'untested';

export interface InvitationRow {
  topic: string;
  n: number;
  score: number;
  band: InvitationBand;
}

function bandFor(n: number, score: number): InvitationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'closed';
  if (score < 0.55) return 'gated';
  if (score < 0.85) return 'allowed';
  return 'invited';
}

export function summarizeDtmTopicInvitationFlow(events: InvitationEvent[]): InvitationRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const c = acc.get(e.topic)!;
    c.sum += w;
    c.n += 1;
  }
  const out: InvitationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function closedDtmTopics(rows: InvitationRow[]): InvitationRow[] {
  return rows.filter((r) => r.band === 'closed' || r.band === 'gated');
}
