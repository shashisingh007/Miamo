import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface CuriosityCadenceEvent {
  topic: string;
  timestampMs: number;
  kind: 'question' | 'follow-up' | 'statement' | 'dismiss';
}

export type CuriosityCadenceBand = 'stale' | 'sparse' | 'curious' | 'investigative' | 'untested';

export interface CuriosityCadenceRow {
  topic: string;
  n: number;
  questionsPerHour: number;
  followUpRatio: number;
  band: CuriosityCadenceBand;
}

function bandFor(n: number, qph: number, followUpRatio: number): CuriosityCadenceBand {
  if (n === 0) return 'untested';
  if (qph < 0.05) return 'stale';
  if (qph < 0.5) return 'sparse';
  if (qph < 2 || followUpRatio < 0.25) return 'curious';
  return 'investigative';
}

export function summarizeDtmTopicCuriosityCadence(
  events: CuriosityCadenceEvent[]
): CuriosityCadenceRow[] {
  const acc = new Map<string, {
    n: number;
    qs: number;
    fus: number;
    minT: number;
    maxT: number;
  }>();
  for (const t of DTM_TOPIC_KEYS) {
    acc.set(t, { n: 0, qs: 0, fus: 0, minT: Infinity, maxT: -Infinity });
  }
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const cell = acc.get(e.topic)!;
    cell.n += 1;
    if (e.kind === 'question') cell.qs += 1;
    if (e.kind === 'follow-up') { cell.qs += 1; cell.fus += 1; }
    if (e.timestampMs < cell.minT) cell.minT = e.timestampMs;
    if (e.timestampMs > cell.maxT) cell.maxT = e.timestampMs;
  }
  const out: CuriosityCadenceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const spanMs = c.n > 1 ? Math.max(c.maxT - c.minT, 1) : 3_600_000;
    const qph = c.n === 0 ? 0 : (c.qs * 3_600_000) / spanMs;
    const fur = c.qs === 0 ? 0 : c.fus / c.qs;
    out.push({
      topic,
      n: c.n,
      questionsPerHour: qph,
      followUpRatio: fur,
      band: bandFor(c.n, qph, fur),
    });
  }
  return out;
}

export function staleDtmTopics(rows: CuriosityCadenceRow[]): CuriosityCadenceRow[] {
  return rows.filter((r) => r.band === 'stale');
}
