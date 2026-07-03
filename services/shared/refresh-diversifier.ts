// ─── Refresh Diversifier ───────────────────────────────
// Guarantees each refresh of the top-10 shows a *different mix*
// driven by the user's CURRENT behavior.
//
// Knobs:
//  - new-profile placement: top for novelty-seekers, bottom for the
//    selectivity-driven (revealed by impression-rate × dwell history).
//  - inject 1-2 wildcard picks per refresh for explorers; none for
//    'selective' session moods.
//  - deterministic shuffle within near-tie scores so consecutive
//    refreshes within 5 minutes stay stable but the next 5-minute
//    window varies.
//  - hard-deduplicates against prevShown to avoid loops.

export interface ScoredCandidate<T> {
  user: T;
  score: number;
  isNew?: boolean;        // joined in last 7 days
  ageBucket?: string;     // for diversity
  city?: string;
}

export interface DiversifyOpts {
  refreshIndex: number;       // 0 for first batch, 1, 2, ... per cursor page
  prevShownIds: Set<string>;
  noveltyAffinity: number;    // 0..1, how much user *enjoys* new profiles (from EventAggDaily)
  sessionMood: 'exploring' | 'selective' | 'rush' | 'normal';
  topN: number;               // how many to return
  intent?: 'serious' | 'dtm' | 'casual' | 'exploring';
}

// FNV-1a like deterministic hash → seed for stable jitter.
function seed(refreshIndex: number): number {
  const bucket = Math.floor(Date.now() / 300_000); // changes every 5 min
  let h = 2166136261 ^ bucket ^ (refreshIndex * 16777619);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
function rng(s: number): () => number {
  let x = s || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

export interface DiversifyResult<T> {
  ranked: ScoredCandidate<T>[];
  injected: { newWildcards: number; outOfBox: number };
  reasoning: string[];
}

export function diversify<T extends { id: string }>(
  scored: ScoredCandidate<T>[],
  opts: DiversifyOpts,
): DiversifyResult<T> {
  const reasoning: string[] = [];
  // 1) Filter out previously shown.
  const fresh = scored.filter(c => !opts.prevShownIds.has(c.user.id));
  if (fresh.length === 0) {
    return { ranked: [], injected: { newWildcards: 0, outOfBox: 0 }, reasoning: ['no-fresh-candidates'] };
  }

  // 2) Stable jitter on score (so near-ties shuffle per-refresh).
  const r = rng(seed(opts.refreshIndex));
  const jittered = fresh.map(c => ({ ...c, score: c.score + (r() - 0.5) * 1.5 }));

  // 3) Sort desc.
  jittered.sort((a, b) => b.score - a.score);

  // 4) Diversity dedupe: avoid >3 from same city / >4 from same age bucket
  //    in the top-N.
  const cityCount: Record<string, number> = {};
  const ageCount: Record<string, number> = {};
  const picked: ScoredCandidate<T>[] = [];
  const overflow: ScoredCandidate<T>[] = [];
  for (const c of jittered) {
    const ck = (c.city || '').toLowerCase();
    const ak = c.ageBucket || '';
    if (ck && (cityCount[ck] || 0) >= 3) { overflow.push(c); continue; }
    if (ak && (ageCount[ak] || 0) >= 4) { overflow.push(c); continue; }
    picked.push(c);
    if (ck) cityCount[ck] = (cityCount[ck] || 0) + 1;
    if (ak) ageCount[ak] = (ageCount[ak] || 0) + 1;
    if (picked.length >= opts.topN) break;
  }
  if (picked.length < opts.topN) {
    picked.push(...overflow.slice(0, opts.topN - picked.length));
  }
  if (Object.keys(cityCount).length > 1) reasoning.push(`city-spread:${Object.keys(cityCount).length}`);

  // 5) New-profile placement.
  // High novelty affinity → put a "new" profile at slot 1-2.
  // Low novelty affinity → push them to slot 7+.
  if (opts.sessionMood !== 'selective') {
    const newOnes = picked.filter(c => c.isNew);
    const others = picked.filter(c => !c.isNew);
    if (newOnes.length > 0) {
      if (opts.noveltyAffinity >= 0.6) {
        // Insert one new at slot 1 (after the absolute top).
        const promoted = [others[0], newOnes[0], ...others.slice(1), ...newOnes.slice(1)].filter(Boolean);
        picked.splice(0, picked.length, ...promoted.slice(0, opts.topN));
        reasoning.push('new-promoted-to-top');
      } else if (opts.noveltyAffinity <= 0.3) {
        // Push news to the back.
        const reordered = [...others, ...newOnes];
        picked.splice(0, picked.length, ...reordered.slice(0, opts.topN));
        reasoning.push('new-pushed-to-back');
      }
    }
  }

  // 6) Wildcard injection (explorers only, not in DTM/serious).
  let injectedNew = 0, injectedBox = 0;
  if (opts.sessionMood === 'exploring' && opts.intent !== 'dtm' && opts.intent !== 'serious') {
    // Pull one tail candidate (rank ~30-50) and inject at slot 5.
    const tail = jittered.slice(opts.topN, Math.min(opts.topN + 30, jittered.length));
    if (tail.length > 0 && picked.length >= 5) {
      const wildcard = tail[Math.floor(r() * tail.length)];
      if (wildcard && !picked.some(p => p.user.id === wildcard.user.id)) {
        picked.splice(4, 0, wildcard);
        picked.length = Math.min(picked.length, opts.topN);
        injectedBox = 1;
        reasoning.push('out-of-box-injected@5');
      }
    }
  }
  if (opts.refreshIndex > 0 && opts.noveltyAffinity > 0.4) {
    // Each subsequent refresh, swap slot 8 for a fresh user if available.
    const freshUsers = jittered.filter(c => c.isNew && !picked.some(p => p.user.id === c.user.id));
    if (freshUsers.length > 0 && picked.length >= 8) {
      picked[7] = freshUsers[0];
      injectedNew = 1;
      reasoning.push('refresh-new-wildcard@8');
    }
  }

  return {
    ranked: picked.slice(0, opts.topN),
    injected: { newWildcards: injectedNew, outOfBox: injectedBox },
    reasoning,
  };
}
