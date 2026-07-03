'use client';

// ─── v3.6.0 — Weekly Top-10 Stack ─────────────────────────
// Reads from GET /api/v1/weekly-top (flag-gated by FEATURE_WEEKLY_TOP_ENABLED).
// When the flag is OFF the API returns 404 → `api.getWeeklyTop()` resolves to
// null and this component renders nothing (parent decides whether to hide
// the tab). The empty-data case (flag on but no rows yet for the requester)
// shows a soft "your Top 10 will be ready soon" stub.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Star, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { track } from '@/lib/track';

type WeeklyTopRow = {
  rank: number;
  targetHash: string;
  user: {
    id: string;
    displayName: string;
    photo: string | null;
    age: number | null;
    city: string | null;
  } | null;
};

type WeeklyTopPayload = {
  data: WeeklyTopRow[];
  weekIso: string;
  generatedAt: string | null;
  nextRefreshAt: string | null;
  secondsUntilRefresh: number | null;
};

// "2026W26" → "Week 26 · 2026"
function formatWeekIso(weekIso: string): string {
  const m = /^(\d{4})W(\d{2})$/.exec(weekIso);
  if (!m) return weekIso;
  return `Week ${parseInt(m[2], 10)} · ${m[1]}`;
}

// Fallback: days/hours until next Monday 00:00 UTC (matches server's
// nextWeekRefreshAt when the response is missing that field, e.g. on a
// stale API client). Prefer the server value when available.
function timeUntilRefreshFallback(now: Date = new Date()): { days: number; hours: number; totalSeconds: number } {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = next.getUTCDay();
  const daysUntilNextMonday = ((8 - dow) % 7) || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilNextMonday);
  next.setUTCHours(0, 0, 0, 0);
  const diffMs = Math.max(0, next.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
  return { days, hours, totalSeconds };
}

// Phase F — live countdown formatting. Renders "2d 4h" when > 24h and
// "4h 32m" when < 24h and "32:07" when < 1h. Zero-guard included so we
// never flash a negative countdown between weekly job runs.
function formatCountdown(secondsRemaining: number): string {
  const s = Math.max(0, Math.floor(secondsRemaining));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${mins}m`;
  if (mins >= 1) return `${mins}m ${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

export function WeeklyTop10({ onHide }: { onHide?: () => void }) {
  const router = useRouter();
  const [payload, setPayload] = useState<WeeklyTopPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateClosed, setGateClosed] = useState(false); // 404 → flag off

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getWeeklyTop();
        if (cancelled) return;
        if (res === null) {
          setGateClosed(true);
          // Tell parent to hide the tab/section entirely.
          onHide?.();
        } else {
          setPayload(res);
        }
      } catch {
        // Non-404 errors: treat as empty, keep section visible.
        if (!cancelled) setPayload({ data: [], weekIso: '', generatedAt: null, nextRefreshAt: null, secondsUntilRefresh: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onHide]);

  // Phase F — live countdown. Prefer the server's `secondsUntilRefresh` so
  // client + server agree even if the user's device clock is skewed. When
  // the server field is absent (stale client / edge case), fall back to
  // client-side math against `nextRefreshAt` or the Monday-UTC boundary.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const countdown = useMemo(() => {
    // Client-observed refresh boundary (ms). Priority order:
    //   1. server-authoritative `nextRefreshAt`
    //   2. fallback (next Monday 00:00 UTC)
    let boundaryMs: number;
    if (payload?.nextRefreshAt) {
      boundaryMs = new Date(payload.nextRefreshAt).getTime();
    } else {
      const fb = timeUntilRefreshFallback(new Date(nowMs));
      boundaryMs = nowMs + fb.totalSeconds * 1000;
    }
    const secondsRemaining = Math.max(0, Math.floor((boundaryMs - nowMs) / 1000));
    return { secondsRemaining, boundaryMs };
  }, [payload?.nextRefreshAt, nowMs]);
  // Emit a single tracking event when the countdown hits zero so ops can
  // measure how many users are on the page when the weekly job would have
  // rolled the leaderboard. Guarded by weekIso so a re-mount within the
  // same week does not re-emit.
  useEffect(() => {
    if (!payload?.weekIso) return;
    if (countdown.secondsRemaining > 0) return;
    try { track('weekly_top.countdown_expired', { weekIso: payload.weekIso }); } catch { /* best-effort */ }
  }, [countdown.secondsRemaining, payload?.weekIso]);

  const handleView = useCallback((userId: string, rank: number) => {
    track('weekly_top.card_clicked', { tid: userId, rank });
    // Routes to the existing profile surface. When a future viewer-of route
    // (e.g. /profile/:id) lands, this URL stays compatible.
    router.push(`/profile?user=${encodeURIComponent(userId)}`);
  }, [router]);

  // Flag OFF → render nothing; parent should hide the tab too.
  if (gateClosed) return null;

  return (
    <div className="max-w-[720px] mx-auto px-1 pb-10">
      {/* ─── Header ─── */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-brand font-semibold text-2xl md:text-[26px] text-text-primary tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-main" />
            This week's most compatible
          </h2>
          <p className="text-[12px] text-text-muted mt-1.5 tabular-nums flex items-center gap-2 flex-wrap">
            <span>{payload?.weekIso ? formatWeekIso(payload.weekIso) : 'Loading…'}</span>
            <span className="text-text-muted/40">·</span>
            {countdown.secondsRemaining > 0 ? (
              <span
                aria-live="polite"
                aria-label={`Next refresh in ${formatCountdown(countdown.secondsRemaining)}`}
                className="inline-flex items-center gap-1 rounded-full bg-rose-main/8 px-2 py-0.5 text-[11px] font-semibold text-rose-main"
              >
                Refreshes in {formatCountdown(countdown.secondsRemaining)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                Refreshing now
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ─── Loading ─── */}
      {loading && (
        <ul className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-[78px] rounded-2xl bg-miamo-surface/60 border border-border/40 animate-pulse" />
          ))}
        </ul>
      )}

      {/* ─── Empty state (flag on, no rows yet) ─── */}
      {!loading && payload && payload.data.length === 0 && (
        <div className="rounded-2xl bg-miamo-card border border-border/40 px-5 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-main/10 flex items-center justify-center mx-auto mb-3">
            <Star className="w-5 h-5 text-rose-main" />
          </div>
          <p className="text-[14px] font-semibold text-text-primary">Your Top 10 will be ready soon</p>
          <p className="text-[12px] text-text-muted mt-1.5 max-w-[400px] mx-auto leading-relaxed">
            We're still learning what you love. As you swipe, message, and explore,
            we'll line up the 10 people most compatible with you each week.
          </p>
        </div>
      )}

      {/* ─── List ─── */}
      {!loading && payload && payload.data.length > 0 && (
        <ul className="space-y-2.5">
          {payload.data.map((row) => {
            const u = row.user;
            const key = u?.id ?? `rank-${row.rank}`;
            return (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(row.rank, 10) * 0.025 }}
                className="rounded-2xl bg-miamo-card border border-border/40 hover:border-rose-main/30 transition-colors px-3.5 py-3 flex items-center gap-3.5"
              >
                {/* Rank */}
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-rose-main to-rose-light text-white flex items-center justify-center text-[13px] font-bold tabular-nums shadow-sm">
                  {row.rank}
                </div>

                {/* Photo */}
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-miamo-elevated border border-border/30">
                  {u?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={u.photo} alt={`${u.displayName} photo`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[14px] font-bold text-text-muted">
                      {u?.displayName?.[0] ?? '?'}
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-text-primary truncate">
                    {u?.displayName ?? 'Profile unavailable'}
                    {u?.age != null && <span className="text-text-secondary font-normal">, {u.age}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {u?.city && <span className="text-[11px] text-text-muted truncate">{u.city}</span>}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-main/8 text-rose-main text-[10px] font-semibold tabular-nums">
                      <Star className="w-2.5 h-2.5 fill-current" /> #{row.rank} this week
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => u && handleView(u.id, row.rank)}
                  disabled={!u}
                  className={cn(
                    'shrink-0 flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all',
                    u
                      ? 'bg-rose-main/10 text-rose-main hover:bg-rose-main/15'
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                  )}
                >
                  Spotlight <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {/* Footnote */}
      {!loading && payload && payload.data.length > 0 && (
        <p className="text-[11px] text-text-muted mt-5 text-center">
          Curated weekly from your activity, conversations, and matches.
        </p>
      )}
    </div>
  );
}
