/**
 * Phase 11 \u2014 consumer-facing "why this match" chips.
 *
 * Picks the top-N ingredients by absolute contribution and renders them as
 * short, human-readable chip strings ("Shared interests", "Same vibe").
 * Designed for the discover card's overlay; NOT for on-call debugging
 * (use `explainToText` for that).
 *
 * Caller supplies an optional label override map; defaults cover the 11
 * v6 ingredients. Negative-contribution rows (e.g. regretPenalty) become
 * "caveat" chips with the same shape but `tone: 'warn'`.
 */
import type { ExplainReport } from './explain';

export type ReasonChip = {
  key: string;
  label: string;
  tone: 'positive' | 'warn';
  /** Score-point contribution (signed). */
  contribution: number;
};

const DEFAULT_LABELS: Record<string, string> = {
  interestsOverlap:        'Shared interests',
  vibeAlignment:           'Same vibe',
  behaviouralTwinIndex:    'Similar habits',
  reciprocalIntentScore:   'Mutual intent',
  attentionFit:            'Pays attention to you',
  hesitationFit:           'Decisive in the same way',
  chronotypeOverlap:       'Active at the same times',
  ageSimilarity:           'Close in age',
  distanceFit:             'Lives nearby',
  communicationCadenceFit: 'Replies at your pace',
  moveStyleCompat:         'Complementary style',
  regretPenalty:           'You\u2019ve undone similar swipes',
  repeatPassPenalty:       'You\u2019ve passed on them before',
  windowShoppingDamp:      'Recent browsing without action',
};

export type ChipOptions = {
  /** Max chips returned. Default 3. */
  topN?: number;
  /** Per-key label overrides (merged on top of defaults). */
  labels?: Partial<Record<string, string>>;
  /** Hide negative contributors. Default false. */
  positiveOnly?: boolean;
};

export function topReasonChips(report: ExplainReport, opts: ChipOptions = {}): ReasonChip[] {
  const topN = opts.topN ?? 3;
  const labels = { ...DEFAULT_LABELS, ...(opts.labels ?? {}) };

  const candidates = report.rows
    .filter((r) => Number.isFinite(r.contribution) && r.contribution !== 0)
    .filter((r) => !opts.positiveOnly || r.contribution > 0);

  candidates.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return candidates.slice(0, topN).map((r) => ({
    key: r.key,
    label: labels[r.key] ?? humanise(r.key),
    tone: r.contribution >= 0 ? 'positive' : 'warn',
    contribution: r.contribution,
  }));
}

function humanise(k: string): string {
  return k
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
