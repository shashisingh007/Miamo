/**
 * v4 Beats — selects 1..N short audio "beats" to surface in a pair's
 * conversation. The Beats catalog itself is owned by the messaging service;
 * this picker just ranks catalog entries by pair fit.
 *
 * Formula (brief §2.9):
 *   35% genreFit (jaccard of beat.genres vs candPreferredGenres)
 *   25% tempoFit (closeness of beat.bpm to candPreferredBpmRange)
 *   20% novelty  (1 - exp(-ageSinceLastSendSec / 6h halflife))
 *   10% chronoFit
 *   10% trendingBoost (logScale recent plays cap=1000)
 */
import { jaccard, expDecay, logScale, clip100, clip01, compose } from './math';
import type { FeatureRow } from './signals';
import { registerAlgo } from './registry';

const WEIGHTS = {
  genreFit: 0.35,
  tempoFit: 0.25,
  novelty: 0.20,
  chronoFit: 0.10,
  trendingBoost: 0.10,
} as const;

export type Beat = {
  id: string;
  genres: string[];
  bpm: number;
  recentPlays: number;
};

export type BeatInputs = {
  candFeatures: FeatureRow | null;
  candPreferredGenres: string[];
  candPreferredBpm: { min: number; max: number } | null;
  ageSinceLastBeatSec: number | null;
  nowHour: number;
};

export function scoreBeat(beat: Beat, inp: BeatInputs): { score: number; why: Record<string, number | null> } {
  const genreFit = inp.candPreferredGenres.length ? jaccard(beat.genres, inp.candPreferredGenres) : 0.5;
  let tempoFit = 0.5;
  if (inp.candPreferredBpm) {
    const { min, max } = inp.candPreferredBpm;
    if (beat.bpm >= min && beat.bpm <= max) tempoFit = 1;
    else {
      const dist = beat.bpm < min ? min - beat.bpm : beat.bpm - max;
      tempoFit = clip01(1 - dist / 60);
    }
  }
  const novelty = inp.ageSinceLastBeatSec == null ? 1 : 1 - expDecay(inp.ageSinceLastBeatSec, 6 * 3600);
  const chrono = inp.candFeatures?.chronotype;
  const chronoFit =
    chrono === 'evening' || chrono === 'night' ? (inp.nowHour >= 18 || inp.nowHour < 3 ? 1 : 0.5) :
    chrono === 'morning' ? (inp.nowHour < 12 ? 1 : 0.4) :
    chrono === 'day'     ? 0.7 :
    0.6;
  const trendingBoost = logScale(beat.recentPlays, 1000);
  const breakdown = { genreFit, tempoFit, novelty, chronoFit, trendingBoost };
  const score = clip100(compose(breakdown, WEIGHTS) * 100);
  return { score, why: breakdown };
}

export function pickBeats(catalog: Beat[], inp: BeatInputs, top = 3): Array<{ beat: Beat; score: number; why: Record<string, number | null> }> {
  return catalog.map((b) => ({ beat: b, ...scoreBeat(b, inp) })).sort((a, b) => b.score - a.score).slice(0, top);
}

registerAlgo({
  name: 'beats',
  surface: 'beats',
  usesEvents: ['beats.play', 'beats.skip', 'moves.play', 'msg.thread_open'],
  weights: WEIGHTS,
});
