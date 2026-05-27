/**
 * Tracking worker entrypoint.
 *
 * Runs three loops in one process:
 *   - RollupConsumer  — Redis Stream → EventAggHourly / EventAggDaily
 *   - FeatureAggregator — EventAggDaily → FeatureSnapshot
 *   - HTTP healthz on :3261
 *
 * Honors TRACKING_KILL: when set, the consumer loop is not started and
 * /healthz reports `kill: true`. Useful for emergency stop.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { RollupConsumer } from './rollup';
import { FeatureAggregator } from './feature';
import { CompatWriter } from './compat';
import { EmbeddingWorker } from './embeddings';
import { ColdStore } from './cold-store';
import { EnrichmentWorker } from './enrich';
import { DailyMatchWorker } from './daily-match';

const PORT = Number(process.env.PORT || 3261);
const KILL = process.env.TRACKING_KILL === '1';
const V4_WORKERS = process.env.ALGO_V4_WORKERS_ENABLED === '1';

const prisma = new PrismaClient();
const rollup = new RollupConsumer(prisma);
const feature = new FeatureAggregator(prisma);
const compat = new CompatWriter(prisma);
const embed = new EmbeddingWorker(prisma);
const coldStore = new ColdStore(prisma);
const enrich = new EnrichmentWorker(prisma);
const dailyMatch = new DailyMatchWorker(prisma);

const app = express();
app.get('/healthz', (_req, res) => res.json({ ok: true, kill: KILL, v4Workers: V4_WORKERS, ts: Date.now() }));

async function main(): Promise<void> {
  if (!KILL) {
    await rollup.start();
    feature.start();
    compat.start();
    embed.start();
    coldStore.start();
    if (V4_WORKERS) enrich.start();
    if (V4_WORKERS) dailyMatch.start();
  } else {
    // eslint-disable-next-line no-console
    console.warn('[worker] TRACKING_KILL=1 — loops disabled, only /healthz live');
  }
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[worker] listening on :${PORT} (kill=${KILL})`);
  });
  const shutdown = async (): Promise<void> => {
    server.close();
    dailyMatch.stop();
    enrich.stop();
    coldStore.stop();
    embed.stop();
    compat.stop();
    feature.stop();
    await rollup.stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[worker] fatal:', e);
    process.exit(1);
  });
}

export { app };
