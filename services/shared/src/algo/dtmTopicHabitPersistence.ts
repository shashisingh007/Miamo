import { DTM_TOPIC_KEYS, DtmTopicKey } from './dtmTopics';

export interface DtmHabitEvent {
  topic: string;
  sessionId: string;
  ts: number;
}

export interface DtmTopicHabitRow {
  topic: DtmTopicKey;
  sessionsTouched: number;
  longestStreak: number;
  currentStreak: number;
  persistenceRatio: number; // sessionsTouched / totalSessions (0..1)
  band: 'untested' | 'sporadic' | 'recurring' | 'habit' | 'core';
}

const INDEX = new Set<string>(DTM_TOPIC_KEYS);

export function summarizeDtmTopicHabitPersistence(
  events: ReadonlyArray<DtmHabitEvent>
): DtmTopicHabitRow[] {
  const valid = events.filter((e) => INDEX.has(e.topic) && typeof e.sessionId === 'string' && e.sessionId);
  // Build session ordering (earliest ts per session)
  const sessionFirstTs = new Map<string, number>();
  for (const e of valid) {
    const cur = sessionFirstTs.get(e.sessionId);
    if (cur === undefined || e.ts < cur) sessionFirstTs.set(e.sessionId, e.ts);
  }
  const orderedSessions = [...sessionFirstTs.entries()]
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
    .map(([id]) => id);
  const sessionIndex = new Map<string, number>();
  for (let i = 0; i < orderedSessions.length; i++) sessionIndex.set(orderedSessions[i], i);
  const totalSessions = orderedSessions.length;

  const perTopic = new Map<DtmTopicKey, Set<number>>();
  for (const t of DTM_TOPIC_KEYS) perTopic.set(t, new Set());
  for (const e of valid) {
    perTopic.get(e.topic as DtmTopicKey)!.add(sessionIndex.get(e.sessionId)!);
  }

  const rows: DtmTopicHabitRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    const indices = [...perTopic.get(topic)!].sort((a, b) => a - b);
    const sessionsTouched = indices.length;
    let longestStreak = 0;
    let currentStreak = 0;
    if (totalSessions > 0 && sessionsTouched > 0) {
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < indices.length; i++) {
        if (indices[i] === indices[i - 1] + 1) {
          run++;
          if (run > longestStreak) longestStreak = run;
        } else {
          run = 1;
        }
      }
      // current streak = consecutive presence ending at latest session
      const last = totalSessions - 1;
      let probe = last;
      while (indices.includes(probe)) {
        currentStreak++;
        probe--;
      }
    }
    const persistenceRatio = totalSessions === 0 ? 0 : sessionsTouched / totalSessions;
    let band: DtmTopicHabitRow['band'];
    if (sessionsTouched === 0) band = 'untested';
    else if (persistenceRatio >= 0.8) band = 'core';
    else if (persistenceRatio >= 0.5) band = 'habit';
    else if (persistenceRatio >= 0.25) band = 'recurring';
    else band = 'sporadic';
    rows.push({ topic, sessionsTouched, longestStreak, currentStreak, persistenceRatio, band });
  }
  return rows;
}

export function coreDtmTopics(rows: ReadonlyArray<DtmTopicHabitRow>): DtmTopicKey[] {
  return rows.filter((r) => r.band === 'core' || r.band === 'habit').map((r) => r.topic);
}
