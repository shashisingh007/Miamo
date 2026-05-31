import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

// Tracks how reliably reassurance follows expressed vulnerability per topic.
export type ReassuranceEventKind =
  | 'vulnerability'
  | 'reassurance'
  | 'dismissal'
  | 'silence';

export interface DtmReassuranceEvent {
  topic: string;
  kind: ReassuranceEventKind;
  at: number; // ms epoch
}

export interface DtmTopicReassuranceRow {
  topic: DtmTopicKey;
  vulnerabilities: number;
  reassuredCount: number;
  dismissedCount: number;
  ignoredCount: number;
  reassuranceRate: number; // 0..1
  band: 'untested' | 'cold' | 'inconsistent' | 'warm' | 'safe';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);
const VALID = new Set<ReassuranceEventKind>([
  'vulnerability',
  'reassurance',
  'dismissal',
  'silence',
]);

export interface DtmReassuranceOptions {
  windowMs?: number; // how soon a response counts as paired (default 24h)
}

export function summarizeDtmTopicReassurance(
  events: ReadonlyArray<DtmReassuranceEvent>,
  opts: DtmReassuranceOptions = {}
): DtmTopicReassuranceRow[] {
  const windowMs = opts.windowMs ?? 24 * 60 * 60 * 1000;
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive finite number');
  }

  // Group by topic, sort by time
  const byTopic = new Map<DtmTopicKey, DtmReassuranceEvent[]>();
  for (const t of DTM_TOPIC_KEYS) byTopic.set(t, []);
  for (const e of events) {
    if (!INDEX.has(e.topic) || !VALID.has(e.kind) || !Number.isFinite(e.at)) continue;
    byTopic.get(e.topic as DtmTopicKey)!.push(e);
  }
  const rows: DtmTopicReassuranceRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const list = byTopic.get(topic)!.slice().sort((a, b) => a.at - b.at);
    let vul = 0;
    let rea = 0;
    let dis = 0;
    let ign = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].kind !== 'vulnerability') continue;
      vul++;
      const deadline = list[i].at + windowMs;
      let paired: ReassuranceEventKind | null = null;
      for (let j = i + 1; j < list.length && list[j].at <= deadline; j++) {
        if (list[j].kind === 'reassurance') {
          paired = 'reassurance';
          break;
        }
        if (list[j].kind === 'dismissal') {
          paired = 'dismissal';
          break;
        }
      }
      if (paired === 'reassurance') rea++;
      else if (paired === 'dismissal') dis++;
      else ign++;
    }
    if (vul === 0) {
      rows.push({
        topic,
        vulnerabilities: 0,
        reassuredCount: 0,
        dismissedCount: 0,
        ignoredCount: 0,
        reassuranceRate: 0,
        band: 'untested',
      });
      continue;
    }
    const rate = rea / vul;
    let band: DtmTopicReassuranceRow['band'];
    if (rate >= 0.85) band = 'safe';
    else if (rate >= 0.6) band = 'warm';
    else if (rate >= 0.3) band = 'inconsistent';
    else band = 'cold';
    rows.push({
      topic,
      vulnerabilities: vul,
      reassuredCount: rea,
      dismissedCount: dis,
      ignoredCount: ign,
      reassuranceRate: rate,
      band,
    });
  }
  return rows;
}

export function coldReassuranceDtmTopics(
  rows: ReadonlyArray<DtmTopicReassuranceRow>
): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'cold').map((r) => r.topic);
}
