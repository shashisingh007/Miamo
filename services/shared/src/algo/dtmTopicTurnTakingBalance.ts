import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type DtmTurnInitiator = 'self' | 'partner';

export interface DtmTopicTurnEvent {
  topic: string;
  initiator: DtmTurnInitiator;
}

export type DtmTurnBalanceBand =
  | 'self_dominant'
  | 'self_leaning'
  | 'balanced'
  | 'partner_leaning'
  | 'partner_dominant'
  | 'untouched';

export interface DtmTopicTurnTakingRow {
  topic: DtmTopicKey;
  selfTurns: number;
  partnerTurns: number;
  total: number;
  /** selfShare = selfTurns / total in [0,1]; 0 when untouched */
  selfShare: number;
  /** balance = selfShare - 0.5 in [-0.5, 0.5]; 0 when untouched */
  balance: number;
  band: DtmTurnBalanceBand;
}

function bandOf(selfShare: number, total: number): DtmTurnBalanceBand {
  if (total === 0) return 'untouched';
  if (selfShare >= 0.8) return 'self_dominant';
  if (selfShare >= 0.6) return 'self_leaning';
  if (selfShare > 0.4) return 'balanced';
  if (selfShare > 0.2) return 'partner_leaning';
  return 'partner_dominant';
}

export function summarizeDtmTopicTurnTaking(
  events: readonly DtmTopicTurnEvent[]
): DtmTopicTurnTakingRow[] {
  const counts = new Map<string, { self: number; partner: number }>();
  for (const e of events) {
    if (!e || !INDEX.has(e.topic)) continue;
    if (e.initiator !== 'self' && e.initiator !== 'partner') continue;
    let c = counts.get(e.topic);
    if (!c) {
      c = { self: 0, partner: 0 };
      counts.set(e.topic, c);
    }
    if (e.initiator === 'self') c.self++;
    else c.partner++;
  }
  const rows: DtmTopicTurnTakingRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = counts.get(topic) ?? { self: 0, partner: 0 };
    const total = c.self + c.partner;
    if (total === 0) continue;
    const selfShare = c.self / total;
    rows.push({
      topic,
      selfTurns: c.self,
      partnerTurns: c.partner,
      total,
      selfShare,
      balance: selfShare - 0.5,
      band: bandOf(selfShare, total),
    });
  }
  return rows;
}

export function overallDtmTurnTakingShare(
  rows: readonly DtmTopicTurnTakingRow[]
): number {
  if (rows.length === 0) return 0;
  let self = 0;
  let total = 0;
  for (const r of rows) {
    self += r.selfTurns;
    total += r.total;
  }
  return total === 0 ? 0 : self / total;
}
