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
};

// "2026W26" → "Week 26 · 2026"
function formatWeekIso(weekIso: string): string {
  const m = /^(\d{4})W(\d{2})$/.exec(weekIso);
  if (!m) return weekIso;
  return `Week ${parseInt(m[2], 10)} · ${m[1]}`;
}

// Days/hours until next Sunday 00:00 UTC (when the weekly job re-runs).
function timeUntilRefresh(now: Date = new Date()): { days: number; hours: number } {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Day of week 0=Sun, 1=Mon, …, 6=Sat. We want next 0 (Sun) at 00:00 UTC.
  const dow = next.getUTCDay();
  const daysUntilSun = dow === 0 ? 7 : 7 - dow;
  next.setUTCDate(next.getUTCDate() + daysUntilSun);
  const diffMs = next.getTime() - now.getTime();
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
  return { days, hours };
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
        if (!cancelled) setPayload({ data: [], weekIso: '', generatedAt: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onHide]);

  const refresh = useMemo(() => timeUntilRefresh(), []);

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
          <p className="text-[12px] text-text-muted mt-1.5 tabular-nums">
            {payload?.weekIso ? formatWeekIso(payload.weekIso) : 'Loading…'}
            <span className="mx-2 text-text-muted/40">·</span>
            Refreshes Sun in {refresh.days}d {refresh.hours}h
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
