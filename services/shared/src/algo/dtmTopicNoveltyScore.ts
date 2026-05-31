import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmNoveltyEvent {
  topic: string;
  ts: number;
}

export interface DtmTopicNoveltyRow {
  topic: DtmTopicKey;
  totalTouches: number;
  recentTouches: number; // within recentMs
  ageMs: number; // ms since most recent touch (Infinity if never)
  novelty: number; // 0..1, higher = more novel for user (untouched / stale)
  band: 'fresh' | 'familiar' | 'novel' | 'unseen';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export interface DtmTopicNoveltyOptions {
  recentMs?: number; // window deemed "recent". Default 14 days
  staleMs?: number; // ms after which a topic is fully novel again. Default 90 days
}

export function summarizeDtmTopicNovelty(
  events: ReadonlyArray<DtmNoveltyEvent>,
  nowMs: number,
  opts: DtmTopicNoveltyOptions = {}
): DtmTopicNoveltyRow[] {
  const recentMs = opts.recentMs ?? 14 * 24 * 60 * 60 * 1000;
  const staleMs = opts.staleMs ?? 90 * 24 * 60 * 60 * 1000;
  if (recentMs <= 0 || staleMs <= 0) throw new Error('recentMs/staleMs must be positive');
  if (staleMs <= recentMs) throw new Error('staleMs must exceed recentMs');

  const totals = new Map<DtmTopicKey, number>();
  const recents = new Map<DtmTopicKey, number>();
  const lastTs = new Map<DtmTopicKey, number>();
  for (const t of DTM_TOPIC_KEYS) {
    totals.set(t, 0);
    recents.set(t, 0);
  }
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const k = e.topic as DtmTopicKey;
    totals.set(k, totals.get(k)! + 1);
    if (nowMs - e.ts <= recentMs) recents.set(k, recents.get(k)! + 1);
    const prev = lastTs.get(k);
    if (prev === undefined || e.ts > prev) lastTs.set(k, e.ts);
  }

  const rows: DtmTopicNoveltyRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const total = totals.get(topic)!;
    const recent = recents.get(topic)!;
    const last = lastTs.get(topic);
    const ageMs = last === undefined ? Infinity : Math.max(0, nowMs - last);
    let novelty: number;
    let band: DtmTopicNoveltyRow['band'];
    if (total === 0) {
      novelty = 1;
      band = 'unseen';
    } else if (ageMs >= staleMs) {
      novelty = 1;
      band = 'novel';
    } else if (recent > 0) {
      // recently touched — novelty inversely scales with recent count, floor 0.05
      const damp = Math.min(1, recent / 5);
      novelty = Math.max(0.05, 1 - damp);
      band = recent >= 3 ? 'fresh' : 'familiar';
    } else {
      // not recent but not stale: linear ramp from 0 (at recentMs) to 1 (at staleMs)
      const t = (ageMs - recentMs) / (staleMs - recentMs);
      novelty = Math.min(1, Math.max(0, t));
      band = novelty >= 0.5 ? 'novel' : 'familiar';
    }
    rows.push({ topic, totalTouches: total, recentTouches: recent, ageMs, novelty, band });
  }
  return rows;
}

export function rankNovelDtmTopics(rows: ReadonlyArray<DtmTopicNoveltyRow>): DtmTopicKey[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.novelty !== a.novelty) return b.novelty - a.novelty;
    return a.topic < b.topic ? -1 : 1;
  });
  return sorted.map((r) => r.topic);
}
