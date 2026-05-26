#!/usr/bin/env tsx
/**
 * v4 algo smoke: stands up a PrismaSignalReader against the dev DB and runs
 * forYou + aiPicks + moves on the first N active users. Prints scored
 * results + explains. Use to spot-check tuning after weight changes.
 *
 * Usage:
 *   npx tsx scripts/algo-smoke.ts [--limit=5]
 *   ALGO_SMOKE_USER_ID=<id> npx tsx scripts/algo-smoke.ts
 *
 * Exits 0 on success, 1 on error. Never writes to the database.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { PrismaSignalReader } from '../services/shared/src/algo/signals';
import { rankForYou } from '../services/shared/src/algo/forYou';
import { scoreAiPicksV4 } from '../services/shared/src/algo/aiPicks';
import { suggestMoves } from '../services/shared/src/algo/moves';

async function main(): Promise<number> {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = arg ? Number(arg.split('=')[1]) : 5;
  const prisma = new PrismaClient();
  const reader = new PrismaSignalReader(prisma);

  try {
    const me = process.env.ALGO_SMOKE_USER_ID
      ? await prisma.user.findUnique({ where: { id: process.env.ALGO_SMOKE_USER_ID } })
      : await prisma.user.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!me) { console.error('no user found'); return 1; }
    console.log(`smoke: me=${me.id} (${(me as { name?: string }).name ?? 'noname'})`);

    const cands = await prisma.user.findMany({
      where: { id: { not: me.id } },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    if (cands.length === 0) { console.error('no candidates'); return 1; }

    const candEntries = cands.map((c) => ({
      id: c.id,
      intent: ((c as { intent?: string }).intent ?? null),
      age: ((c as { age?: number }).age ?? null),
      interests: ((c as { interests?: string[] }).interests ?? []),
      cityKm: null,
    }));

    const fy = await rankForYou(reader, me.id, candEntries, 'full');
    console.log('\n=== forYou ===');
    for (const r of fy) console.log(`  ${r.score.toFixed(1).padStart(5)}  ${r.id}  cacheHit=${r.explain.cacheHit}`);

    console.log('\n=== aiPicks (top 1) ===');
    const myHash = reader.hashOf(me.id);
    const meFeat = await reader.features(myHash);
    const candHashes = candEntries.map((c) => reader.hashOf(c.id));
    const pairMap = await reader.pairCompat(myHash, candHashes);
    const priorMap = await reader.priorTargets(myHash, candHashes, 14);
    let best = { id: '', score: -1 };
    for (let i = 0; i < candEntries.length; i++) {
      const c = candEntries[i];
      const cFeat = await reader.features(candHashes[i]);
      const { score } = scoreAiPicksV4({
        me: meFeat, cand: cFeat,
        myIntent: null, candIntent: c.intent,
        myAge: null, candAge: c.age, cityKm: c.cityKm,
        myInterests: [], candInterests: c.interests,
        pair: pairMap.get(candHashes[i]), priorCount: priorMap.get(candHashes[i]) || 0,
        impressionsLast48h: 0, consent: 'full',
        subs: { cf: 50, active: 50, serious: 50, matchHistoryAffinity: 50, vibeMomentum: 50 },
        rand: () => 1,
      });
      if (score > best.score) best = { id: c.id, score };
    }
    console.log(`  ${best.score.toFixed(1)}  ${best.id}`);

    console.log('\n=== moves (top 3 for best aiPicks) ===');
    const bestFeat = await reader.features(reader.hashOf(best.id));
    const moves = suggestMoves({
      candFeatures: bestFeat, lastUsedAgoSec: {}, candLastAction: null,
      nowHour: new Date().getHours(), deepCompatAffinity: {}, consent: 'full',
    });
    for (const m of moves) console.log(`  ${m.score.toString().padStart(3)}  ${m.kind}`);

    return 0;
  } catch (e) {
    console.error('smoke failed:', (e as Error).message);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((c) => process.exit(c));
