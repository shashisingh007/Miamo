'use client';

/**
 * Admin — Fairness Gini dashboard (v1.2 Task 3c).
 *
 * Read-only display of the last-week's gender-conditional Gini scores
 * produced by `tracking-worker/src/fairnessAudit.ts` (writes AuditLog
 * rows with `action='fairness_audit'`). Server route:
 *   GET /api/v1/admin/fairness-gini
 *
 * Gated on:
 *   1. Client-visible flag NEXT_PUBLIC_FEATURE_ADMIN_FAIRNESS_ENABLED
 *      (used only to hide the surface; the real security gate is the
 *      server-side isAdmin check on `User`).
 *   2. Server-side `User.isAdmin=true`. If the caller isn't an admin
 *      the server returns 403 and this page shows a "not authorised"
 *      state without leaking anything.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Gini = { m: number; f: number; o: number };
type Audit = {
  id: string;
  createdAt: string;
  gini: Gini | null;
  threshold: number | null;
  overBuckets: string[];
  usersAudited: number | null;
};

export default function AdminFairnessPage() {
  const [latest, setLatest] = useState<Audit | null>(null);
  const [history, setHistory] = useState<Audit[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden' | 'off' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await api.getAdminFairnessGini();
        if (cancelled) return;
        if (r?.data) {
          setLatest(r.data.latest ?? null);
          setHistory(r.data.history ?? []);
          setStatus('ok');
        } else {
          setStatus('off');
        }
      } catch (e: any) {
        if (cancelled) return;
        if (e?.statusCode === 403) setStatus('forbidden');
        else if (e?.statusCode === 404) setStatus('off');
        else { setStatus('error'); setError(e?.message ?? 'unknown error'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') return <div className="p-6 text-sm text-text-muted">Loading fairness audit…</div>;
  if (status === 'off') return <div className="p-6 text-sm text-text-muted">Fairness dashboard is disabled.</div>;
  if (status === 'forbidden') return <div className="p-6 text-sm text-rose">You are not authorised to view this page.</div>;
  if (status === 'error') return <div className="p-6 text-sm text-rose">Could not load fairness audit: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-text-primary">Fairness Gini Dashboard</h1>
        <p className="text-[12px] text-text-muted">Gender-conditional Gini over the last 7 days of Discover impressions. Threshold alarms at &gt; 0.45 sustained for 6h.</p>
      </header>

      {latest?.gini ? (
        <section className="rounded-2xl border border-border p-4 bg-miamo-card">
          <h2 className="text-[13px] font-semibold text-text-primary mb-3">Latest audit — {new Date(latest.createdAt).toLocaleString()}</h2>
          <div className="grid grid-cols-3 gap-3">
            <GiniCell label="Male"   value={latest.gini.m} threshold={latest.threshold ?? 0.45} />
            <GiniCell label="Female" value={latest.gini.f} threshold={latest.threshold ?? 0.45} />
            <GiniCell label="Other"  value={latest.gini.o} threshold={latest.threshold ?? 0.45} />
          </div>
          {latest.overBuckets.length > 0 && (
            <p className="mt-3 text-[12px] text-rose">Alert — buckets over threshold: {latest.overBuckets.join(', ')}</p>
          )}
          <p className="mt-2 text-[11px] text-text-muted">Users audited: {latest.usersAudited ?? '—'}</p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border p-4 bg-miamo-card">
          <p className="text-[12px] text-text-muted">No audit rows in the last 7 days yet. The tracking worker writes one row every audit tick (~6h).</p>
        </section>
      )}

      {history.length > 1 && (
        <section className="rounded-2xl border border-border p-4 bg-miamo-card">
          <h2 className="text-[13px] font-semibold text-text-primary mb-3">History (last {history.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left py-1 pr-3">When</th>
                  <th className="text-right py-1 px-2">M</th>
                  <th className="text-right py-1 px-2">F</th>
                  <th className="text-right py-1 px-2">O</th>
                  <th className="text-right py-1 pl-2">Users</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-border/40">
                    <td className="py-1 pr-3 text-text-secondary">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{h.gini?.m?.toFixed(3) ?? '—'}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{h.gini?.f?.toFixed(3) ?? '—'}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{h.gini?.o?.toFixed(3) ?? '—'}</td>
                    <td className="py-1 pl-2 text-right tabular-nums">{h.usersAudited ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Placeholder for a future line chart — kept as a hint for the
              next iteration; today we ship the numerical table so the
              admin surface is useful from day 1. */}
          <div className="mt-3 h-16 border border-dashed border-border/60 rounded flex items-center justify-center">
            <span className="text-[11px] text-text-muted">chart placeholder</span>
          </div>
        </section>
      )}
    </div>
  );
}

function GiniCell({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const over = value > threshold;
  return (
    <div className={`rounded-xl border p-3 ${over ? 'border-rose/60 bg-rose/5' : 'border-border bg-miamo-surface/40'}`}>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-text-primary">{value.toFixed(3)}</div>
      <div className="text-[10px] text-text-muted">threshold {threshold}</div>
    </div>
  );
}
