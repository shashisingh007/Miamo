import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type CompassionateChallengeSignal =
  | 'caring'
  | 'kind'
  | 'mixed'
  | 'pointed'
  | 'harsh';

export interface CompassionateChallengeEvent {
  topic: string;
  signal: CompassionateChallengeSignal;
}

const WEIGHTS: Record<CompassionateChallengeSignal, number> = {
  caring: 1,
  kind: 0.8,
  mixed: 0.55,
  pointed: 0.25,
  harsh: 0,
};

export type CompassionateChallengeBand =
  | 'harsh'
  | 'pointed'
  | 'mixed'
  | 'kind'
  | 'untested';

export interface CompassionateChallengeRow {
  topic: string;
  n: number;
  score: number;
  band: CompassionateChallengeBand;
}

function bandFor(n: number, score: number): CompassionateChallengeBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'harsh';
  if (score < 0.55) return 'pointed';
  if (score < 0.85) return 'mixed';
  return 'kind';
}

export function summarizeDtmTopicCompassionateChallenge(
  events: CompassionateChallengeEvent[]
): CompassionateChallengeRow[] {
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
  const out: CompassionateChallengeRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function harshDtmTopicsCompassion(
  rows: CompassionateChallengeRow[]
): CompassionateChallengeRow[] {
  return rows.filter((r) => r.band === 'harsh' || r.band === 'pointed');
}
