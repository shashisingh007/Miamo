/**
 * Cold-store dump worker.
 *
 * Once per day, exports rolled-up tracking tables to gzipped NDJSON files on
 * the local filesystem under COLD_STORE_DIR (default ./cold-store). This is
 * the simplest possible "tier-2" path — no S3 SDK, no Parquet writer, no
 * external dep. Ops can mount the directory as a volume and sync to S3
 * out-of-band (aws s3 sync, rclone, restic, whatever), or extend this file
 * to push directly when the credentials and lifecycle policy are decided.
 *
 * Retention: rows older than RETENTION_DAYS (default 90) are exported and
 * then deleted from the hot tables. Rows newer than that are left alone.
 * The first export of any given day is idempotent — re-running produces an
 * identical file (filename is YYYY-MM-DD).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.COLDSTORE_INTERVAL_MS || 24 * 60 * 60 * 1000);
const RETENTION_DAYS = Number(process.env.COLDSTORE_RETENTION_DAYS || 90);
const DIR = process.env.COLD_STORE_DIR || path.resolve(process.cwd(), 'cold-store');
const PAGE = 5000;

export function toNdjsonGz(rows: unknown[]): Buffer {
  const ndjson = rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
  return gzipSync(Buffer.from(ndjson, 'utf8'));
}

export class ColdStore {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    // Run once at startup (out of band), then on the interval.
    void this.tick();
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[coldstore] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<{ hourly: number; daily: number; consent: number }> {
    await mkdir(DIR, { recursive: true });
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const stamp = new Date().toISOString().slice(0, 10);

    const hourly = await this.dumpAndPrune(
      'EventAggHourly', 'bucket', cutoff, path.join(DIR, `${stamp}-hourly.ndjson.gz`),
    );
    const daily = await this.dumpAndPrune(
      'EventAggDaily', 'day', cutoff, path.join(DIR, `${stamp}-daily.ndjson.gz`),
    );
    const consent = await this.dumpAndPrune(
      'ConsentEvent', 'ts', cutoff, path.join(DIR, `${stamp}-consent.ndjson.gz`),
    );
    return { hourly, daily, consent };
  }

  private async dumpAndPrune(table: string, tsCol: string, cutoff: Date, file: string): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE "${tsCol}" < $1 ORDER BY "${tsCol}" ASC LIMIT $2`,
      cutoff, PAGE,
    )) as unknown[];
    if (rows.length === 0) return 0;
    await writeFile(file, toNdjsonGz(rows));
    // Delete the exported window in one statement (cutoff is exclusive upper bound).
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "${table}" WHERE "${tsCol}" < $1`, cutoff,
    );
    return rows.length;
  }
}

export const _internals = { toNdjsonGz };
