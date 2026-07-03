/**
 * dtmAnswerHistory \u2014 DTM Phase 16 bounded answer ring (pure).
 *
 * Keeps the most recent N answers per user so downstream modules
 * (drift, variance, momentum) can avoid re-scanning the entire DB.
 * Newest first. Bounded to `maxEntries` (default 200) to keep payload
 * small in Redis/session storage.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmAnswerEntry = {
  topicKey: DtmTopicKey;
  value: number;   // -1..1 normalised answer value
  atMs: number;
};

export type DtmAnswerHistory = {
  entries: DtmAnswerEntry[]; // newest first
  maxEntries: number;
};

export function createAnswerHistory(maxEntries = 200): DtmAnswerHistory {
  return { entries: [], maxEntries: Math.max(1, maxEntries | 0) };
}

export function appendAnswer(history: DtmAnswerHistory, entry: DtmAnswerEntry): DtmAnswerHistory {
  if (!DTM_TOPIC_KEYS.includes(entry.topicKey)) return history;
  if (!Number.isFinite(entry.value) || !Number.isFinite(entry.atMs)) return history;
  const v = Math.max(-1, Math.min(1, entry.value));
  const next = [{ ...entry, value: v }, ...history.entries];
  if (next.length > history.maxEntries) next.length = history.maxEntries;
  return { entries: next, maxEntries: history.maxEntries };
}

export function recentByTopic(
  history: DtmAnswerHistory,
  topicKey: DtmTopicKey,
  limit = 10,
): DtmAnswerEntry[] {
  const out: DtmAnswerEntry[] = [];
  for (const e of history.entries) {
    if (e.topicKey === topicKey) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function lastAnsweredAt(history: DtmAnswerHistory): Partial<Record<DtmTopicKey, number>> {
  const out: Partial<Record<DtmTopicKey, number>> = {};
  for (const e of history.entries) {
    if (out[e.topicKey] === undefined) out[e.topicKey] = e.atMs;
  }
  return out;
}

export function pruneOlderThan(history: DtmAnswerHistory, cutoffMs: number): DtmAnswerHistory {
  const entries = history.entries.filter((e) => e.atMs >= cutoffMs);
  return { entries, maxEntries: history.maxEntries };
}
