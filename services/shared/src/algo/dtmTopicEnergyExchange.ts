import { DTM_TOPIC_KEYS } from './dtmTopics';

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export type EnergyDirection = 'give' | 'receive' | 'reciprocal' | 'extract';

export interface EnergyExchangeEvent {
  topic: string;
  direction: EnergyDirection;
  magnitude?: number;
}

export type EnergyBand = 'depleting' | 'lopsided' | 'balanced' | 'flowing' | 'untested';

export interface EnergyExchangeRow {
  topic: string;
  n: number;
  reciprocityRatio: number;
  band: EnergyBand;
}

function bandFor(n: number, ratio: number): EnergyBand {
  if (n === 0) return 'untested';
  if (ratio < 0.3) return 'depleting';
  if (ratio < 0.6) return 'lopsided';
  if (ratio < 0.85) return 'balanced';
  return 'flowing';
}

export function summarizeDtmTopicEnergyExchange(events: EnergyExchangeEvent[]): EnergyExchangeRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const t of DTM_TOPIC_KEYS) acc.set(t, { sum: 0, n: 0 });
  for (const e of events) {
    if (!INDEX.has(e.topic)) continue;
    const mag = Math.max(0, Math.min(1, e.magnitude ?? 1));
    let v: number;
    switch (e.direction) {
      case 'reciprocal': v = 1; break;
      case 'give': v = 0.5; break;
      case 'receive': v = 0.5; break;
      case 'extract': v = 0; break;
      default: continue;
    }
    const cell = acc.get(e.topic)!;
    cell.sum += v * mag;
    cell.n += 1;
  }
  const out: EnergyExchangeRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const c = acc.get(topic)!;
    const ratio = c.n === 0 ? 0 : c.sum / c.n;
    out.push({ topic, n: c.n, reciprocityRatio: ratio, band: bandFor(c.n, ratio) });
  }
  return out;
}

export function depletingDtmTopics(rows: EnergyExchangeRow[]): EnergyExchangeRow[] {
  return rows.filter((r) => r.band === 'depleting');
}
