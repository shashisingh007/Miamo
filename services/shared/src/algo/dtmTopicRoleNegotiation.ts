import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type RoleNegotiationSignal =
  | 'co-defined'
  | 'renegotiated-openly'
  | 'assumed-default'
  | 'silent-pressure'
  | 'imposed';

export interface RoleNegotiationEvent {
  topic: string;
  signal: RoleNegotiationSignal;
}

const WEIGHTS: Record<RoleNegotiationSignal, number> = {
  'co-defined': 1,
  'renegotiated-openly': 0.85,
  'assumed-default': 0.5,
  'silent-pressure': 0.25,
  'imposed': 0,
};

export type RoleNegotiationBand = 'imposed' | 'assumed' | 'flexible' | 'co-authored' | 'untested';

export interface RoleNegotiationRow {
  topic: string;
  n: number;
  score: number;
  band: RoleNegotiationBand;
}

function bandFor(n: number, score: number): RoleNegotiationBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'imposed';
  if (score < 0.55) return 'assumed';
  if (score < 0.85) return 'flexible';
  return 'co-authored';
}

export function summarizeDtmTopicRoleNegotiation(events: RoleNegotiationEvent[]): RoleNegotiationRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const w = WEIGHTS[e.signal];
    if (w === undefined) continue;
    const cell = acc.get(e.topic)!;
    cell.sum += w;
    cell.n += 1;
  }
  const out: RoleNegotiationRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function imposedDtmTopics(rows: RoleNegotiationRow[]): RoleNegotiationRow[] {
  return rows.filter((r) => r.band === 'imposed');
}
