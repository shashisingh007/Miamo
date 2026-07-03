'use client';

/**
 * Phase F — Family Brief share-history dashboard.
 *
 * Sits inline on the DTM tab, below the "Generate Family Brief" CTA.
 * Shows the user's own share history (last 50 shares):
 *   - format + generatedAt (relative)
 *   - viewCount (visible only when trackViews was ON at generate time)
 *   - expiry (or "Expired")
 *   - copy-link + open-brief actions
 *
 * Endpoint gate: FEATURE_FAMILY_BRIEF_SHARES_ENABLED. When OFF, the
 * component renders nothing (Phase F flag policy: never lie in the UI).
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Eye, EyeOff, Copy, ExternalLink, FileText, Image as ImageIcon, Type, Clock, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { useToast } from '@/components/ui/toast';

type ShareRow = {
  id: string;
  token: string;
  format: 'pdf' | 'image' | 'text';
  generatedAt: string;
  expiresAt: string;
  viewCount: number;
  trackViews: boolean;
  expired: boolean;
  url: string;
};

const FORMAT_ICONS: Record<ShareRow['format'], React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  image: ImageIcon,
  text: Type,
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function absoluteUrl(rel: string): string {
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${rel}`;
}

export function FamilyBriefSharesPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; active: number; totalViews: number } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled' | 'error'>('loading');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getFamilyBriefShares();
        if (cancelled) return;
        const data: ShareRow[] = res.data || [];
        const s = res.summary || null;
        setRows(data);
        setSummary(s);
        setStatus('ready');
        // Phase F telemetry — funnel signal for the shares dashboard.
        try {
          const track = (await import('@/lib/track')).track;
          track('family_brief.dashboard_viewed', { totalShares: data.length, activeShares: s?.active ?? 0 });
        } catch { /* best-effort */ }
      } catch (e: any) {
        if (cancelled) return;
        if (e && (e.status === 404 || e?.code === 'NOT_FOUND')) {
          setStatus('disabled');
          return;
        }
        logError('dtm.familyBrief.shares', e);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'disabled') return null;
  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-border/40 p-4 text-xs text-text-muted text-center">
        Couldn't load share history.
      </div>
    );
  }
  if (status === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-miamo-surface/70 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border/40 bg-miamo-surface/50 p-5 text-center">
        <Share2 className="w-5 h-5 text-rose-main mx-auto mb-2" />
        <p className="text-xs font-semibold text-text-primary">No family briefs yet</p>
        <p className="text-[11px] text-text-muted mt-1">Generate one above to share with your family.</p>
      </div>
    );
  }

  const handleCopy = async (row: ShareRow) => {
    try {
      const abs = absoluteUrl(row.url);
      await navigator.clipboard.writeText(abs);
      setCopiedToken(row.token);
      setTimeout(() => setCopiedToken(null), 1800);
      try {
        const track = (await import('@/lib/track')).track;
        track('family_brief.shared', { channel: 'copy_link', format: row.format });
      } catch { /* best-effort */ }
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="space-y-3">
      {summary && (
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span><strong className="text-text-primary">{summary.total}</strong> total</span>
          <span className="text-text-muted/40">·</span>
          <span><strong className="text-text-primary">{summary.active}</strong> active</span>
          <span className="text-text-muted/40">·</span>
          <span><strong className="text-text-primary">{summary.totalViews}</strong> total views</span>
        </div>
      )}
      <ul className="space-y-2" role="list">
        {rows.map((r, i) => {
          const Icon = FORMAT_ICONS[r.format];
          const abs = absoluteUrl(r.url);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 ${r.expired ? 'border-border/30 bg-miamo-surface/30 opacity-70' : 'border-border/40 bg-miamo-card'}`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${r.expired ? 'bg-miamo-surface' : 'bg-rose-main/10'}`}>
                <Icon className={`w-3.5 h-3.5 ${r.expired ? 'text-text-muted' : 'text-rose-main'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span className="capitalize">{r.format}</span>
                  <span className="text-text-muted font-normal">{relativeTime(r.generatedAt)}</span>
                  {r.expired && (
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">Expired</span>
                  )}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                  {r.trackViews ? (
                    <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> {r.viewCount} view{r.viewCount === 1 ? '' : 's'}</span>
                  ) : (
                    <span className="flex items-center gap-1"><EyeOff className="w-2.5 h-2.5" /> views private</span>
                  )}
                  <span className="text-text-muted/40">·</span>
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {r.expired ? 'expired' : `expires ${new Date(r.expiresAt).toLocaleDateString()}`}</span>
                </div>
              </div>
              {!r.expired && (
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(r)}
                    className="h-7 w-7 rounded-lg bg-miamo-surface hover:bg-miamo-card border border-border/40 text-text-secondary flex items-center justify-center transition"
                    aria-label="Copy share link"
                  >
                    {copiedToken === r.token ? <Check className="w-3 h-3 text-rose-main" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={abs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 rounded-lg bg-miamo-surface hover:bg-miamo-card border border-border/40 text-text-secondary flex items-center justify-center transition"
                    aria-label="Open family brief"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
