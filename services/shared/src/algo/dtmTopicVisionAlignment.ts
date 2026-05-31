import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type VisionAlignmentSignal =
  | 'shared-vision'
  | 'aligned'
  | 'partial'
  | 'diverging'
  | 'opposed';

export interface VisionAlignmentEvent {
  topic: string;
  signal: VisionAlignmentSignal;
}

const WEIGHTS: Record<VisionAlignmentSignal, number> = {
  'shared-vision': 1,
  'aligned': 0.8,
  'partial': 0.55,
  'diverging': 0.25,
  'opposed': 0,
};

export type VisionAlignmentBand =
  | 'opposed'
  | 'diverging'
  | 'partial'
  | 'aligned'
  | 'untested';

export interface VisionAlignmentRow {
  topic: string;
  n: number;
  score: number;
  band: VisionAlignmentBand;
}

function bandFor(n: number, score: number): VisionAlignmentBand {
  if (n === 0) return 'untested';
  if (score < 0.3) return 'opposed';
  if (score < 0.55) return 'diverging';
  if (score < 0.85) return 'partial';
  return 'aligned';
}

export function summarizeDtmTopicVisionAlignment(
  events: VisionAlignmentEvent[],
): VisionAlignmentRow[] {
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
  const out: VisionAlignmentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const score = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, score, band: bandFor(c.n, score) });
  }
  return out;
}

export function opposedDtmTopics(rows: VisionAlignmentRow[]): VisionAlignmentRow[] {
  return rows.filter((r) => r.band === 'opposed');
}
