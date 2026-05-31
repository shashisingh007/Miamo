import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Tracks shame-avoidance signals per topic: deflection, minimization, self-attack, retreat vs honest-engagement.
export type ShameSignal =
  | 'honest-engage'
  | 'deflect'
  | 'minimize'
  | 'self-attack'
  | 'retreat';

export interface DtmShameEvent {
  topic: string;
  signal: ShameSignal;
}

export interface DtmTopicShameRow {
  topic: DtmTopicKey;
  events: number;
  honestEngage: number;
  deflect: number;
  minimize: number;
  selfAttack: number;
  retreat: number;
  avoidanceScore: number; // 0..1
  band: 'untested' | 'grounded' | 'cautious' | 'avoidant' | 'flooded';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<ShameSignal>([
  'honest-engage',
  'deflect',
  'minimize',
  'self-attack',
  'retreat',
]);
const WEIGHTS: Record<ShameSignal, number> = {
  'honest-engage': -0.6,
  deflect: 0.5,
  minimize: 0.4,
  'self-attack': 0.8,
  retreat: 0.7,
};

export function summarizeDtmTopicShameAvoidance(
  events: ReadonlyArray<DtmShameEvent>
): DtmTopicShameRow[] {
  const m = new Map<
    DtmTopicKey,
    { he: number; df: number; mi: number; sa: number; re: number; sum: number }
  >();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { he: 0, df: 0, mi: 0, sa: 0, re: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.signal)) continue;
    const b = m.get(e.topic as DtmTopicKey)!;
    if (e.signal === 'honest-engage') b.he++;
    else if (e.signal === 'deflect') b.df++;
    else if (e.signal === 'minimize') b.mi++;
    else if (e.signal === 'self-attack') b.sa++;
    else b.re++;
    b.sum += WEIGHTS[e.signal];
  }
  const rows: DtmTopicShameRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { he, df, mi, sa, re, sum } = m.get(topic)!;
    const n = he + df + mi + sa + re;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        honestEngage: 0,
        deflect: 0,
        minimize: 0,
        selfAttack: 0,
        retreat: 0,
        avoidanceScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = clamp01((sum / n + 1) / 2);
    let band: DtmTopicShameRow['band'];
    if (score >= 0.8) band = 'flooded';
    else if (score >= 0.6) band = 'avoidant';
    else if (score >= 0.4) band = 'cautious';
    else band = 'grounded';
    rows.push({
      topic,
      events: n,
      honestEngage: he,
      deflect: df,
      minimize: mi,
      selfAttack: sa,
      retreat: re,
      avoidanceScore: score,
      band,
    });
  }
  return rows;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function floodedShameDtmTopics(rows: ReadonlyArray<DtmTopicShameRow>): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'flooded').map((r) => r.topic);
}
