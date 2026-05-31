import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Tracks depth of self-disclosure per topic on a 4-level Jourard-inspired scale.
export type DisclosureDepth = 'surface' | 'preference' | 'belief' | 'core';

export interface DtmDisclosureEvent {
  topic: string;
  depth: DisclosureDepth;
}

export interface DtmTopicDisclosureRow {
  topic: DtmTopicKey;
  events: number;
  surface: number;
  preference: number;
  belief: number;
  core: number;
  depthScore: number; // 0..1
  band: 'untested' | 'guarded' | 'casual' | 'open' | 'intimate';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<DisclosureDepth>(['surface', 'preference', 'belief', 'core']);
const WEIGHTS: Record<DisclosureDepth, number> = {
  surface: 0,
  preference: 1 / 3,
  belief: 2 / 3,
  core: 1,
};

export function summarizeDtmTopicSelfDisclosure(
  events: ReadonlyArray<DtmDisclosureEvent>
): DtmTopicDisclosureRow[] {
  const m = new Map<DtmTopicKey, { s: number; p: number; b: number; c: number; sum: number }>();
  for (const t of DTM_TOPIC_KEYS) m.set(t, { s: 0, p: 0, b: 0, c: 0, sum: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.depth)) continue;
    const bucket = m.get(e.topic as DtmTopicKey)!;
    if (e.depth === 'surface') bucket.s++;
    else if (e.depth === 'preference') bucket.p++;
    else if (e.depth === 'belief') bucket.b++;
    else bucket.c++;
    bucket.sum += WEIGHTS[e.depth];
  }
  const rows: DtmTopicDisclosureRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const { s, p, b, c, sum } = m.get(topic)!;
    const n = s + p + b + c;
    if (n === 0) {
      rows.push({
        topic,
        events: 0,
        surface: 0,
        preference: 0,
        belief: 0,
        core: 0,
        depthScore: 0,
        band: 'untested',
      });
      continue;
    }
    const score = sum / n;
    let band: DtmTopicDisclosureRow['band'];
    if (score >= 0.75) band = 'intimate';
    else if (score >= 0.5) band = 'open';
    else if (score >= 0.25) band = 'casual';
    else band = 'guarded';
    rows.push({
      topic,
      events: n,
      surface: s,
      preference: p,
      belief: b,
      core: c,
      depthScore: score,
      band,
    });
  }
  return rows;
}

export function intimateDisclosureDtmTopics(
  rows: ReadonlyArray<DtmTopicDisclosureRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'intimate').map((r) => r.topic);
}
