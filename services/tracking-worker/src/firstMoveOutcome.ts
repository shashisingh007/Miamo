/**
 * FirstMoveOutcome reconciler — v6.5.
 *
 * Joins recent `msg.send` events with `firstMove=true` (in the payload)
 * against `msg.read` events on the same (sender → recipient) pair within
 * a 24h window, and writes one row per pair into `FirstMoveOutcome`.
 *
 * The data lives at two granularities:
 *   - `EventAggDaily` carries per-uidHash counts of msg.send / msg.read
 *     plus `meta.targets` keyed by recipient hash (already capped 64).
 *   - For per-thread firstMove pairing, the worker reads the daily
 *     aggregate's `meta.firstMove` JSON map of recipient → { sentAt,
 *     kind } when present (web client populates this via `trackMsgSend`).
 *
 * Default-OFF: set FIRST_MOVE_OUTCOME_ENABLED=1 to start the loop. Runs
 * every FIRST_MOVE_OUTCOME_INTERVAL_MS (default 30 min). Idempotent on
 * (aHash, bHash, sentAt).
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.FIRST_MOVE_OUTCOME_INTERVAL_MS || 30 * 60 * 1000);
const LOOKBACK_HOURS = Number(process.env.FIRST_MOVE_OUTCOME_LOOKBACK_HOURS || 25);
const ENABLED = process.env.FIRST_MOVE_OUTCOME_ENABLED === '1';

export type FirstMoveSendRow = {
  aHash: string;
  bHash: string;
  sentAt: Date;
  kind: string; // 'text' | 'voice' | 'media' | 'reaction'
};

export type ReadRow = {
  /** uidHash of the recipient who read the message. */
  reader: string;
  /** uidHash of the sender. */
  sender: string;
  readAt: Date;
};

/**
 * Pure helper. Given a list of first-move sends and a list of reads,
 * returns one outcome per (aHash, bHash, sentAt) describing whether the
 * recipient read it within `windowMs` (default 24h). `replyMs` is the
 * elapsed milliseconds until the first qualifying read.
 */
export function reconcileFirstMoves(
  sends: FirstMoveSendRow[],
  reads: ReadRow[],
  windowMs = 24 * 60 * 60 * 1000,
): Array<{
  aHash: string;
  bHash: string;
  sentAt: Date;
  kind: string;
  replied: boolean;
  replyMs: number | null;
}> {
  // Index reads by (sender, reader) → sorted readAt list for log-N lookup.
  const idx = new Map<string, number[]>();
  for (const r of reads) {
    const k = `${r.sender}|${r.reader}`;
    const arr = idx.get(k) || [];
    arr.push(r.readAt.getTime());
    idx.set(k, arr);
  }
  for (const arr of idx.values()) arr.sort((a, b) => a - b);

  return sends.map((s) => {
    const k = `${s.aHash}|${s.bHash}`;
    const arr = idx.get(k);
    const sentMs = s.sentAt.getTime();
    let replyMs: number | null = null;
    if (arr) {
      // Find the first read at or after sentMs and within window.
      // Binary search for efficiency at scale.
      let lo = 0;
      let hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (arr[mid] < sentMs) lo = mid + 1;
        else hi = mid;
      }
      if (lo < arr.length) {
        const delta = arr[lo] - sentMs;
        if (delta >= 0 && delta <= windowMs) replyMs = delta;
      }
    }
    return {
      aHash: s.aHash,
      bHash: s.bHash,
      sentAt: s.sentAt,
      kind: s.kind,
      replied: replyMs !== null,
      replyMs,
    };
  });
}

/** Parses the `meta.firstMove` JSON shape that the rollup consumer is
 *  expected to merge from per-event `msg.send {firstMove:true}` payloads.
 *  Shape: { [bHash]: { sentAtMs: number, kind: 'text'|'voice'|... } }. */
export function readFirstMoveSendsFromMeta(
  rows: Array<{ uidHash: string; meta: { firstMove?: Record<string, { sentAtMs: number; kind: string }> } | null }>,
): FirstMoveSendRow[] {
  const out: FirstMoveSendRow[] = [];
  for (const r of rows) {
    const fm = r.meta?.firstMove;
    if (!fm) continue;
    for (const [bHash, info] of Object.entries(fm)) {
      if (!info || typeof info.sentAtMs !== 'number' || !info.kind) continue;
      out.push({
        aHash: r.uidHash,
        bHash,
        sentAt: new Date(info.sentAtMs),
        kind: info.kind,
      });
    }
  }
  return out;
}

export class FirstMoveOutcomeWorker {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[first-move-outcome] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    const sendRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","meta"
       FROM "EventAggDaily"
       WHERE "evt" = 'msg.send'
         AND "day" >= NOW() - ($1 || ' hours')::interval
         AND meta ? 'firstMove'`,
      String(LOOKBACK_HOURS),
    )) as Array<{ uidHash: string; meta: { firstMove?: Record<string, { sentAtMs: number; kind: string }> } | null }>;

    const sends = readFirstMoveSendsFromMeta(sendRows);
    if (sends.length === 0) return 0;

    // Pull msg.read meta for each unique recipient set; project into ReadRow.
    const senders = [...new Set(sends.map((s) => s.aHash))];
    const recipients = [...new Set(sends.map((s) => s.bHash))];

    const readRowsRaw = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash" AS reader, "meta"
       FROM "EventAggDaily"
       WHERE "evt" = 'msg.read'
         AND "uidHash" = ANY($1::text[])
         AND "day" >= NOW() - ($2 || ' hours')::interval
         AND meta ? 'reads'`,
      recipients, String(LOOKBACK_HOURS + 24),
    )) as Array<{ reader: string; meta: { reads?: Record<string, number> } | null }>;

    const reads: ReadRow[] = [];
    const senderSet = new Set(senders);
    for (const r of readRowsRaw) {
      const reads_ = r.meta?.reads;
      if (!reads_) continue;
      for (const [sender, readAtMs] of Object.entries(reads_)) {
        if (!senderSet.has(sender)) continue;
        reads.push({ reader: r.reader, sender, readAt: new Date(Number(readAtMs)) });
      }
    }

    const outcomes = reconcileFirstMoves(sends, reads);
    let written = 0;
    for (const o of outcomes) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "FirstMoveOutcome"
           ("aHash","bHash","sentAt","kind","replied","replyMs")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT ("aHash","bHash","sentAt") DO UPDATE SET
           "replied" = EXCLUDED."replied",
           "replyMs" = EXCLUDED."replyMs"`,
        o.aHash, o.bHash, o.sentAt, o.kind, o.replied, o.replyMs,
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { reconcileFirstMoves, readFirstMoveSendsFromMeta };
