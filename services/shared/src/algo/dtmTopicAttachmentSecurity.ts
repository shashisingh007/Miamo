import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type AttachmentSecuritySignal =
  | 'secure'
  | 'available'
  | 'tentative'
  | 'anxious'
  | 'avoidant';

export interface AttachmentSecurityEvent {
  topic: string;
  signal: AttachmentSecuritySignal;
}

const WEIGHTS: Record<AttachmentSecuritySignal, number> = {
  secure: 1,
  available: 0.8,
  tentative: 0.55,
  anxious: 0.25,
  avoidant: 0,
};

export type AttachmentSecurityBand =
  | 'avoidant'
  | 'anxious'
  | 'tentative'
  | 'secure'
  | 'untested';

export interface AttachmentSecurityRow {
  topic: string;
  n: number;
  score: number;
  band: AttachmentSecurityBand;
}

function bandFor(n: number, score: number): AttachmentSecurityBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'avoidant';
  if (score < 0.55) return 'anxious';
  if (score < 0.85) return 'tentative';
  return 'secure';
}

export function summarizeDtmTopicAttachmentSecurity(events: AttachmentSecurityEvent[]): AttachmentSecurityRow[] {
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
  const out: AttachmentSecurityRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function insecureAttachmentDtmTopics(rows: AttachmentSecurityRow[]): AttachmentSecurityRow[] {
  return rows.filter((r) => r.band === 'avoidant' || r.band === 'anxious');
}
