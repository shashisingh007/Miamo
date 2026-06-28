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
import { SafetyRollup } from './safetyRollup';
import { FirstMoveOutcomeWorker } from './firstMoveOutcome';
import { SessionSummaryWorker } from './sessionSummary';
import { FocusAffinityWorker } from './focusAffinity';
import { LearnerLoop } from './learnerLoop';
import { DeferPrune } from './deferPrune';
import { IntentInferenceLoop } from './intentInference';
import { ExposureScheduler, getExposureSchedulerCounters } from './exposureScheduler';
import { StableMatchTop10, getStableMatchCounters } from './stableMatchTop10';
import { FairnessAudit, getFairnessAuditCounters } from './fairnessAudit';
import { getRegistry } from '../../shared/src/algo/registry';
import { v4FlagSnapshot } from '../../shared/src/algo/flags';
// Register every algo so getRegistry() returns the full inventory.
import '../../shared/src/algo/forYou';
import '../../shared/src/algo/aiPicks';
import '../../shared/src/algo/moves';
import '../../shared/src/algo/new';
import '../../shared/src/algo/active';
import '../../shared/src/algo/verified';
import '../../shared/src/algo/serious';
import '../../shared/src/algo/dtm';
import '../../shared/src/algo/cf';
import '../../shared/src/algo/messageSuggest';
import '../../shared/src/algo/beats';
import '../../shared/src/algo/notifyTiming';
import '../../shared/src/algo/searchAugment';
import '../../shared/src/algo/feedAugment';
import '../../shared/src/algo/postImpressionRerank';
import '../../shared/src/algo/aiMatch';

const PORT = Number(process.env.PORT || 3261);
const KILL = process.env.TRACKING_KILL === '1';
const V4_WORKERS = process.env.ALGO_V4_WORKERS_ENABLED === '1';
const INTENT_INFERENCE_ENABLED = process.env.INTENT_INFERENCE_ENABLED === '1';

const prisma = new PrismaClient();
const rollup = new RollupConsumer(prisma);
const feature = new FeatureAggregator(prisma);
const compat = new CompatWriter(prisma);
const embed = new EmbeddingWorker(prisma);
const coldStore = new ColdStore(prisma);
const enrich = new EnrichmentWorker(prisma);
const dailyMatch = new DailyMatchWorker(prisma);
const safetyRollup = new SafetyRollup(prisma);
const firstMoveOutcome = new FirstMoveOutcomeWorker(prisma);
const sessionSummary = new SessionSummaryWorker(prisma);
const focusAffinity = new FocusAffinityWorker(prisma);
const learnerLoop = new LearnerLoop(prisma);
const deferPrune = new DeferPrune(prisma);
const exposureScheduler = new ExposureScheduler(prisma);
const stableMatchTop10 = new StableMatchTop10(prisma);
const fairnessAudit = new FairnessAudit(prisma);
const loops = {
  intentInference: new IntentInferenceLoop(prisma),
};

const app = express();
app.get('/healthz', (_req, res) => res.json({
  ok: true, kill: KILL, v4Workers: V4_WORKERS,
  algos: getRegistry().length, ts: Date.now(),
}));
app.get('/v4/status', (_req, res) => {
  const reg = getRegistry();
  res.json({
    ts: Date.now(),
    kill: KILL,
    flags: v4FlagSnapshot(),
    algos: reg.map((r) => ({ name: r.name, surface: r.surface, weights: r.weights, usesEvents: r.usesEvents })),
    loops: {
      intentInference: loops.intentInference.status(),
      // v3.6.0 jobs — gated by their own env flags; counters expose
      // process-level health regardless of enabled state.
      exposureScheduler: {
        enabled: exposureScheduler.isEnabled(),
        counters: getExposureSchedulerCounters(),
      },
      stableMatchTop10: {
        enabled: stableMatchTop10.isEnabled(),
        lastRunAt: stableMatchTop10.getLastRunAt(),
        counters: getStableMatchCounters(),
      },
      fairnessAudit: {
        enabled: fairnessAudit.isEnabled(),
        lastRunAt: fairnessAudit.getLastRunAt(),
        counters: getFairnessAuditCounters(),
      },
    },
  });
});

async function main(): Promise<void> {
  if (!KILL) {
    await rollup.start();
    feature.start();
    compat.start();
    embed.start();
    coldStore.start();
    if (V4_WORKERS) enrich.start();
    if (V4_WORKERS) dailyMatch.start();
    // v6.5 — all default-OFF; start() is a no-op unless their env flag is set.
    safetyRollup.start();
    firstMoveOutcome.start();
    sessionSummary.start();
    focusAffinity.start();
    learnerLoop.start();
    // v6.6 — default-OFF; runs every 6h to drop stale see-later rows.
    deferPrune.start();
    // v3.6.0 — default-OFF; INTENT_INFERENCE_ENABLED=1 starts the loop.
    if (INTENT_INFERENCE_ENABLED) loops.intentInference.start();
    // v3.6.0 v8 — all default-OFF; start() is a no-op unless their env flag is set.
    exposureScheduler.start();
    stableMatchTop10.start();
    fairnessAudit.start();
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
    fairnessAudit.stop();
    stableMatchTop10.stop();
    exposureScheduler.stop();
    loops.intentInference.stop();
    deferPrune.stop();
    learnerLoop.stop();
    focusAffinity.stop();
    sessionSummary.stop();
    firstMoveOutcome.stop();
    safetyRollup.stop();
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
