'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('miamo_token');
}

interface Completion {
  score: number;
  threshold: number;
  missing: string[];
  dtm: boolean;
}

const STEPS: { key: string; label: string; helper: string }[] = [
  { key: 'age',         label: 'Age + gender',  helper: 'Set under Profile → Basics.' },
  { key: 'city',        label: 'City',          helper: 'Where you live (visible city, not exact location).' },
  { key: 'profession',  label: 'Profession',    helper: 'What you do day-to-day.' },
  { key: 'bio',         label: 'Bio',           helper: 'At least 30 characters — give people a reason to swipe right.' },
  { key: 'photos',      label: 'Photos (1+)',   helper: 'Upload 1–3 clear photos. First one is your hero.' },
  { key: 'prompts',     label: 'Prompts',       helper: 'Answer at least 1 prompt to add personality.' },
  { key: 'interests',   label: 'Interests',     helper: 'Pick a few interests to fuel matching.' },
  { key: 'lifestyle',   label: 'Lifestyle',     helper: 'Height, education, languages, diet.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [data, setData] = useState<Completion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const token = getToken();
      if (!token) { router.replace('/login'); return; }
      const r = await fetch(`${API_URL}/api/v1/profiles/me/completion`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      setData(body.data);
    } catch (e: any) {
      setError(e?.message || 'Could not load completion');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="mx-auto mt-16 max-w-xl px-6 text-center text-text-muted">Loading…</div>;
  }
  if (error || !data) {
    return <div className="mx-auto mt-16 max-w-xl px-6 text-center text-red-600">{error || 'No data'}</div>;
  }

  const pct = Math.round((data.score / data.threshold) * 100);
  const isDone = data.score >= data.threshold;
  const missingSet = new Set(data.missing);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-12">
      <h1 className="text-3xl font-medium tracking-tight">Welcome to miamo</h1>
      <p className="mt-2 text-text-muted">
        Finish your profile to unlock matches, messages, and discover.
        {data.dtm ? ' DTM mode needs an 80% profile.' : ' Casual mode needs 60%.'}
      </p>

      <section className="mt-6 rounded-2xl border border-token bg-miamo-card p-5 shadow-soft">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completion</span>
          <span className="tabular-nums text-text-muted">{data.score} / {data.threshold}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-rose-main transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        {isDone && (
          <button
            className="mt-4 w-full rounded-xl bg-rose-main py-2.5 text-sm font-medium text-white shadow-button"
            onClick={() => router.push('/discover')}
          >
            You're set — continue to Discover
          </button>
        )}
      </section>

      <section className="mt-6 space-y-3">
        {STEPS.map(step => {
          const missing = missingSet.has(step.key);
          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 rounded-xl border p-4 ${missing ? 'border-token bg-miamo-card' : 'border-green-200 bg-green-50/40'}`}
            >
              <div className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs ${missing ? 'bg-black/5 text-text-muted' : 'bg-green-600 text-white'}`}>
                {missing ? '·' : '✓'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{step.label}</div>
                <div className="text-xs text-text-muted">{step.helper}</div>
              </div>
              {missing && (
                <button
                  className="text-xs font-medium text-rose-main hover:underline"
                  onClick={() => router.push('/profile')}
                >
                  Finish →
                </button>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
