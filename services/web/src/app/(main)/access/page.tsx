'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores';
import { usePersistentState } from '@/hooks/usePersistentState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

function getToken() {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

interface Req {
  id: string;
  fromUserId: string;
  toUserId: string;
  field: string;
  status: string;
  message?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

const FIELD_LABEL: Record<string,string> = {
  photos: 'Photos', phone: 'Phone', family: 'Family info', income: 'Income',
  kundli: 'Kundli', lastName: 'Last name', exactCity: 'Exact city', socials: 'Socials', email: 'Email',
};

export default function AccessInboxPage() {
  const [tab, setTab] = usePersistentState<'inbox' | 'outbox'>('access:tab', 'inbox');
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const token = getToken();
      const r = await fetch(`${API_URL}/api/v1/access/requests/${tab}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json();
      setItems(body.data || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [tab]);

  async function decide(id: string, action: 'approve' | 'deny' | 'revoke') {
    setBusyId(id);
    try {
      const token = getToken();
      const method = action === 'revoke' ? 'DELETE' : 'POST';
      const path = action === 'revoke' ? `/api/v1/access/requests/${id}` : `/api/v1/access/requests/${id}/${action}`;
      const r = await fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: action === 'revoke' ? undefined : '{}' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } finally { setBusyId(null); }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-medium tracking-tight">Access</h1>
        <p className="mt-1 text-sm text-text-muted">
          Grant or deny field-level access to your profile. You can revoke any grant later.
        </p>
      </header>

      <div className="mb-5 inline-flex rounded-xl border border-token bg-miamo-card p-1">
        <button onClick={() => setTab('inbox')} className={`rounded-lg px-4 py-1.5 text-sm transition ${tab === 'inbox' ? 'bg-rose-main text-white' : 'text-text-muted'}`}>Inbox</button>
        <button onClick={() => setTab('outbox')} className={`rounded-lg px-4 py-1.5 text-sm transition ${tab === 'outbox' ? 'bg-rose-main text-white' : 'text-text-muted'}`}>Outbox</button>
      </div>

      {loading ? (
        <div className="text-text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-token bg-miamo-card p-8 text-center text-text-muted">
          {tab === 'inbox' ? 'No incoming requests.' : 'No outgoing requests.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(r => (
            <li key={r.id} className="rounded-2xl border border-token bg-miamo-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{FIELD_LABEL[r.field] || r.field}</div>
                  <div className="text-xs text-text-muted">
                    {tab === 'inbox' ? `from ${r.fromUserId.slice(0, 8)}` : `to ${r.toUserId.slice(0, 8)}`} · {r.status}
                  </div>
                  {r.message && <div className="mt-2 text-sm text-text-muted">"{r.message}"</div>}
                </div>
                <div className="flex gap-2">
                  {tab === 'inbox' && r.status === 'pending' && (
                    <>
                      <button disabled={busyId === r.id} onClick={() => decide(r.id, 'deny')} className="rounded-lg border border-token bg-white px-3 py-1.5 text-xs text-text-muted hover:bg-black/5 disabled:opacity-50">Deny</button>
                      <button disabled={busyId === r.id} onClick={() => decide(r.id, 'approve')} className="rounded-lg bg-rose-main px-3 py-1.5 text-xs text-white shadow-button disabled:opacity-50">Approve</button>
                    </>
                  )}
                  {tab === 'inbox' && r.status === 'approved' && (
                    <button disabled={busyId === r.id} onClick={() => decide(r.id, 'revoke')} className="rounded-lg border border-token bg-white px-3 py-1.5 text-xs text-text-muted hover:bg-black/5 disabled:opacity-50">Revoke</button>
                  )}
                  {tab === 'outbox' && (r.status === 'pending' || r.status === 'approved') && (
                    <button disabled={busyId === r.id} onClick={() => decide(r.id, 'revoke')} className="rounded-lg border border-token bg-white px-3 py-1.5 text-xs text-text-muted hover:bg-black/5 disabled:opacity-50">{r.status === 'pending' ? 'Withdraw' : 'Revoke'}</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
