'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores';
import { usePersistentState } from '@/hooks/usePersistentState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

const CATEGORIES = [
  'music','visual-art','writing','photography','cooking','dance',
  'fitness','comedy','tech-code','crafts','performance','other',
] as const;

function getToken() {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

interface Item {
  id: string;
  userId: string;
  category: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  pinned: boolean;
  matchCount: number;
  moveCount: number;
  createdAt: string;
}

export default function ShowcasePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = usePersistentState<string>('showcase:category', '');
  const [loading, setLoading] = useState(true);

  async function load(cat: string) {
    setLoading(true);
    try {
      const token = getToken();
      const qs = cat ? `?category=${encodeURIComponent(cat)}` : '';
      const r = await fetch(`${API_URL}/api/v1/showcase${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json();
      setItems(body.data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(category); }, [category]);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-medium tracking-tight">Showcase</h1>
        <p className="mt-1 text-sm text-text-muted">Real things you make. Real people who care.</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-1 text-xs transition ${category === '' ? 'border-rose-main bg-rose-main text-white' : 'border-token bg-miamo-card text-text-muted'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-xs transition ${category === c ? 'border-rose-main bg-rose-main text-white' : 'border-token bg-miamo-card text-text-muted'}`}
          >
            {c.replace('-', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-token bg-miamo-card p-8 text-center text-text-muted">
          Nothing here yet. Be the first to showcase {category || 'something'}.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(it => (
            <li key={it.id} className="rounded-2xl border border-token bg-miamo-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {it.pinned && <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-main">Pinned</span>}
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">{it.category.replace('-', ' ')}</span>
                  </div>
                  <h2 className="mt-1 text-lg font-medium leading-tight">{it.title}</h2>
                  {it.body && <p className="mt-1 text-sm text-text-muted">{it.body}</p>}
                  {it.url && (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-rose-main hover:underline">
                      Open →
                    </a>
                  )}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <div>{it.moveCount} moves</div>
                  <div>{it.matchCount} matches</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
