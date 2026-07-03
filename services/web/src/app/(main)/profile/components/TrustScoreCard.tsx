'use client';

/**
 * Phase F — Trust Score card (Profile page).
 *
 * Fetches the trust breakdown from GET /api/v1/profiles/me/trust and renders
 * a compact card with:
 *   - Total score 0..100 + tier badge (unverified/starter/trusted/verified)
 *   - Signal-by-signal progress bar (selfie, email, phone, photos,
 *     completion) with "next step" nudge text for each missing signal
 *
 * The endpoint 404s when FEATURE_TRUST_SCORE_ENABLED is OFF. In that case
 * the component renders nothing (no lie, no fallback). This keeps the
 * profile page clean before the flag flips.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { useRouter } from 'next/navigation';

type Signal = { key: 'selfie' | 'email' | 'phone' | 'photos' | 'completion'; label: string; contribution: number; weight: number; complete: boolean; nextStep?: string };
type Breakdown = { score: number; tier: 'unverified' | 'starter' | 'trusted' | 'verified'; badgeEligible: boolean; signals: Signal[] };

const TIER_STYLES: Record<Breakdown['tier'], { bg: string; text: string; label: string }> = {
  unverified: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', label: 'Unverified' },
  starter:    { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Starter' },
  trusted:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Trusted' },
  verified:   { bg: 'bg-rose-main/10', text: 'text-rose-main', label: 'Verified' },
};

export function TrustScoreCard() {
  const router = useRouter();
  const [data, setData] = useState<Breakdown | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getTrustScore();
        if (cancelled) return;
        const bd: Breakdown = res.data;
        setData(bd);
        setStatus('ready');
        // Emit `trust_score.viewed` — a small funnel signal for how many
        // users see the breakdown. Best-effort.
        try {
          const track = (await import('@/lib/track')).track;
          track('trust_score.viewed', { score: bd.score, tier: bd.tier, badgeEligible: bd.badgeEligible });
        } catch { /* tracking best-effort */ }
      } catch (e: any) {
        if (cancelled) return;
        // 404 with FEATURE_TRUST_SCORE_ENABLED=0 → hide silently.
        if (e && (e.status === 404 || e?.code === 'NOT_FOUND')) {
          setStatus('disabled');
          return;
        }
        logError('profile.trustScore', e);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'disabled' || status === 'error') return null;

  if (status === 'loading' || !data) {
    return (
      <Card className="p-4">
        <div className="h-16 animate-pulse rounded bg-miamo-surface" />
      </Card>
    );
  }

  const tier = TIER_STYLES[data.tier];
  const nextGap = data.signals.find((s) => !s.complete);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${tier.text}`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${tier.text}`}>Trust score</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{data.score}</span>
            <span className="text-xs text-text-muted">/ 100</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.bg} ${tier.text}`}>
              {tier.label}
            </span>
          </div>
        </div>
        {data.badgeEligible && (
          <div className="rounded-lg bg-rose-main/10 px-2 py-1 text-[10px] font-semibold text-rose-main flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Badge earned
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {data.signals.map((s) => {
          const ratio = s.weight > 0 ? Math.min(1, s.contribution / s.weight) : 0;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-[11px] text-text-secondary">{s.label}</div>
              <div className="relative flex-1 h-1.5 rounded-full bg-miamo-surface overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ratio * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className={`h-full ${s.complete ? 'bg-emerald-500/70' : 'bg-rose-main/60'}`}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-[10px] text-text-muted">{s.contribution}</div>
            </div>
          );
        })}
      </div>

      {nextGap?.nextStep && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-miamo-surface px-3 py-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-rose-main" />
            <span className="text-xs text-text-secondary">{nextGap.nextStep}</span>
          </div>
          {nextGap.key === 'selfie' && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/verify')} aria-label="Start verification">Start</Button>
          )}
          {(nextGap.key === 'email' || nextGap.key === 'phone') && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings?section=account')} aria-label="Open account settings">Open</Button>
          )}
          {(nextGap.key === 'photos' || nextGap.key === 'completion') && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/profile')} aria-label="Edit profile">Edit</Button>
          )}
        </div>
      )}
    </Card>
  );
}
