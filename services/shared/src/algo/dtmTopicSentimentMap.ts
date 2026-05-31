import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicSentimentRow = {
  readonly topic: DtmTopicKey;
  readonly sentiment: number;
  readonly band: 'negative' | 'neutral' | 'positive';
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function bandOf(s: number): DtmTopicSentimentRow['band'] {
  if (s > 0.1) return 'positive';
  if (s < -0.1) return 'negative';
  return 'neutral';
}

export function summarizeDtmTopicSentiment(
  perTopicAnswers: ReadonlyMap<DtmTopicKey, ReadonlyArray<number>>,
): DtmTopicSentimentRow[] {
  const rows: DtmTopicSentimentRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const xs = perTopicAnswers.get(topic) ?? [];
    let acc = 0;
    let n = 0;
    for (const v of xs) {
      if (Number.isFinite(v)) {
        acc += clamp(v);
        n++;
      }
    }
    const sentiment = n === 0 ? 0 : acc / n;
    rows.push({ topic, sentiment, band: bandOf(sentiment) });
  }
  return rows;
}

export function overallDtmSentiment(rows: ReadonlyArray<DtmTopicSentimentRow>): number {
  if (rows.length === 0) return 0;
  let acc = 0;
  for (const r of rows) acc += r.sentiment;
  return acc / rows.length;
}
