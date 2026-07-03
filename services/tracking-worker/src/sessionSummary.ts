/**
 * SessionSummary writer — v6.5.
 *
 * Derives per-session rollups from EventAggHourly. Without per-session
 * granularity in the rollup consumer, we approximate sessions as
 * contiguous hourly buckets per uidHash separated by an idle gap
 * (default 60 minutes of zero activity). Each "session" is summarised
 * once into the SessionSummary table.
 *
 * This is intentionally an over-approximation: when the rollup later
 * starts emitting `meta.sessionId` per row, the worker will pick that up
 * (see `_internals.foldSessionsFromHourly` for the pure helper, which
 * accepts an optional explicit `sessionId` per row).
 *
 * Default-OFF: set SESSION_SUMMARY_ENABLED=1 to start the loop.
 * Idempotent on (uidHash, sessionId).
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.SESSION_SUMMARY_INTERVAL_MS || 10 * 60 * 1000);
const LOOKBACK_HOURS = Number(process.env.SESSION_SUMMARY_LOOKBACK_HOURS || 26);
const IDLE_GAP_MS = Number(process.env.SESSION_SUMMARY_IDLE_GAP_MS || 60 * 60 * 1000);
const MIN_DURATION_MS = Number(process.env.SESSION_SUMMARY_MIN_DURATION_MS || 30 * 1000);
const ENABLED = process.env.SESSION_SUMMARY_ENABLED === '1';

export type HourlyEventRow = {
  uidHash: string;
  evt: string;
  bucket: Date;
  count: number;
  durSum: number;
  /** Optional explicit session id from rollup (when it later supports it). */
  sessionId?: string | null;
  /** Optional route hint (from rollup meta). */
  route?: string | null;
};

export type SessionUpsert = {
  uidHash: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  idleMs: number;
  routesVisited: string[];
  cardsViewed: number;
  swipesLeft: number;
  swipesRight: number;
  msgsSent: number;
  msgsRead: number;
  zeroActionSession: boolean;
  windowShopping: boolean;
  ghostedSelf: boolean;
};

/**
 * Pure helper. Groups hourly rows for one uidHash into sessions, where a
 * gap of `idleGapMs` between consecutive non-empty hours starts a new
 * session. Only sessions of `>= minDurationMs` are emitted.
 */
export function foldSessionsFromHourly(
  rows: HourlyEventRow[],
  idleGapMs: number = IDLE_GAP_MS,
  minDurationMs: number = MIN_DURATION_MS,
): SessionUpsert[] {
  if (rows.length === 0) return [];

  // Group by uidHash, sort by bucket asc.
  const byUser = new Map<string, HourlyEventRow[]>();
  for (const r of rows) {
    const arr = byUser.get(r.uidHash) || [];
    arr.push(r);
    byUser.set(r.uidHash, arr);
  }

  const out: SessionUpsert[] = [];
  for (const [uidHash, list] of byUser.entries()) {
    list.sort((a, b) => a.bucket.getTime() - b.bucket.getTime());

    type S = {
      startedAtMs: number;
      endedAtMs: number;
      idleMs: number;
      routes: Set<string>;
      cards: number;
      sLeft: number;
      sRight: number;
      msgsSent: number;
      msgsRead: number;
      explicitId: string | null;
    };
    const sessions: S[] = [];
    let cur: S | null = null;
    let lastBucketMs = -Infinity;

    for (const r of list) {
      const tMs = r.bucket.getTime();
      const explicit = r.sessionId ?? null;
      const startNew =
        cur === null ||
        (explicit && cur.explicitId && explicit !== cur.explicitId) ||
        tMs - lastBucketMs > idleGapMs;
      if (startNew) {
        cur = {
          startedAtMs: tMs,
          endedAtMs: tMs + 60 * 60 * 1000,
          idleMs: 0,
          routes: new Set<string>(),
          cards: 0,
          sLeft: 0,
          sRight: 0,
          msgsSent: 0,
          msgsRead: 0,
          explicitId: explicit,
        };
        sessions.push(cur);
      } else if (cur) {
        cur.endedAtMs = tMs + 60 * 60 * 1000;
      }
      if (!cur) continue;
      // Fold per-event counters.
      if (r.evt === 'discover.card_view' || r.evt === 'card.impression.100') cur.cards += r.count;
      else if (r.evt === 'swipe.left'  || r.evt === 'discover.swipe.left')   cur.sLeft += r.count;
      else if (r.evt === 'swipe.right' || r.evt === 'discover.swipe.right') cur.sRight += r.count;
      else if (r.evt === 'msg.send') cur.msgsSent += r.count;
      else if (r.evt === 'msg.read') cur.msgsRead += r.count;
      else if (r.evt === 'attention.idle') cur.idleMs += r.durSum;
      if (r.route) cur.routes.add(r.route);
      lastBucketMs = tMs;
    }

    for (const s of sessions) {
      const durMs = s.endedAtMs - s.startedAtMs;
      if (durMs < minDurationMs) continue;
      const totalActions = s.cards + s.sLeft + s.sRight + s.msgsSent + s.msgsRead;
      const zeroAction = totalActions === 0 && durMs > 30 * 1000;
      const windowShopping = s.cards >= 5 && s.sLeft + s.sRight === 0;
      const ghostedSelf = s.msgsRead > 0 && s.msgsSent === 0;
      const sessionId =
        s.explicitId ?? `derived:${new Date(s.startedAtMs).toISOString()}`;
      out.push({
        uidHash,
        sessionId,
        startedAt: new Date(s.startedAtMs),
        endedAt: new Date(s.endedAtMs),
        durationMs: durMs,
        idleMs: Math.min(s.idleMs, durMs),
        routesVisited: [...s.routes],
        cardsViewed: s.cards,
        swipesLeft: s.sLeft,
        swipesRight: s.sRight,
        msgsSent: s.msgsSent,
        msgsRead: s.msgsRead,
        zeroActionSession: zeroAction,
        windowShopping,
        ghostedSelf,
      });
    }
  }
  return out;
}

export class SessionSummaryWorker {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[session-summary] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","evt","bucket","count","durSum",
              ("meta"->>'sessionId') AS "sessionId",
              ("meta"->>'route')     AS "route"
       FROM "EventAggHourly"
       WHERE "bucket" >= NOW() - ($1 || ' hours')::interval
         AND "evt" IN (
           'discover.card_view','card.impression.100',
           'swipe.left','swipe.right','discover.swipe.left','discover.swipe.right',
           'msg.send','msg.read','attention.idle'
         )`,
      String(LOOKBACK_HOURS),
    )) as HourlyEventRow[];
    const summaries = foldSessionsFromHourly(rows);
    let written = 0;
    for (const s of summaries) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SessionSummary"
           ("uidHash","sessionId","startedAt","endedAt","durationMs","idleMs",
            "routesVisited","cardsViewed","swipesLeft","swipesRight",
            "msgsSent","msgsRead","zeroActionSession","windowShopping","ghostedSelf")
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT ("uidHash","sessionId") DO UPDATE SET
           "endedAt"           = EXCLUDED."endedAt",
           "durationMs"        = EXCLUDED."durationMs",
           "idleMs"            = EXCLUDED."idleMs",
           "routesVisited"     = EXCLUDED."routesVisited",
           "cardsViewed"       = EXCLUDED."cardsViewed",
           "swipesLeft"        = EXCLUDED."swipesLeft",
           "swipesRight"       = EXCLUDED."swipesRight",
           "msgsSent"          = EXCLUDED."msgsSent",
           "msgsRead"          = EXCLUDED."msgsRead",
           "zeroActionSession" = EXCLUDED."zeroActionSession",
           "windowShopping"    = EXCLUDED."windowShopping",
           "ghostedSelf"       = EXCLUDED."ghostedSelf"`,
        s.uidHash, s.sessionId, s.startedAt, s.endedAt, s.durationMs, s.idleMs,
        JSON.stringify(s.routesVisited),
        s.cardsViewed, s.swipesLeft, s.swipesRight, s.msgsSent, s.msgsRead,
        s.zeroActionSession, s.windowShopping, s.ghostedSelf,
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { foldSessionsFromHourly };
