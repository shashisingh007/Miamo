'use client';

// ─── v3.2 Onboarding ──────────────────────────────────────────────
// Single screen that drives both the Discover (casual) and DTM (matrimony)
// onboarding flows. Every step is an inline-expand card with chip pickers /
// dropdowns / one-line inputs — almost no free-text typing.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { FieldIcon } from '@/components/FieldIcon';
import type { IconName } from '../../../../../shared/src/fieldMeta';

// Icon per bucket card header (v3.2)
const BUCKET_ICONS: Record<string, IconName> = {
  identity: 'User', city: 'MapPin', photos: 'Camera', bio: 'FileText',
  prompts: 'MessageCircle', interests: 'Tag', lifestyle: 'Sparkles',
  lookingFor: 'HeartHandshake', profession: 'Briefcase', verification: 'Shield',
  inherited: 'User', 'dtm-photos': 'Camera', maritalStatus: 'HeartHandshake',
  'dtm-basics': 'CalendarDays', community: 'Flower2', education: 'GraduationCap',
  career: 'Briefcase', family: 'Home', aboutMe: 'FileText', aboutFamily: 'Home',
  partnerPrefs: 'Heart', kundli: 'Star',
};

// ─── Selector catalogs (kept inline so this page is one-stop) ─────
const INTEREST_OPTIONS = [
  'Travel','Music','Movies','Foodie','Coffee','Tea','Yoga','Gym','Running','Cycling','Hiking','Trekking',
  'Photography','Painting','Writing','Reading','Books','Poetry','Theatre','Dance','Singing','Cooking','Baking',
  'Football','Cricket','Tennis','Basketball','Volleyball','Badminton','Swimming','Surfing','Skiing','Snowboarding',
  'Gaming','Board games','Chess','Anime','Manga','Tech','Startups','Design','Architecture','Astronomy',
  'Volunteering','Activism','Sustainability','Pets','Dogs','Cats','Nature','Beaches','Mountains','Road trips',
  'Wine','Cocktails','Brunch','Street food','Spirituality','Meditation','Astrology','Languages','History','Museums',
];
const LIFESTYLE_DROPDOWNS = {
  drinking: ['never','rarely','socially','often','prefer not to say'],
  smoking:  ['never','rarely','socially','often','prefer not to say'],
  exercise: ['rarely','sometimes','often','daily'],
  diet:     ['everything','vegetarian','vegan','pescatarian','halal','kosher','jain'],
  religion: ['','agnostic','atheist','spiritual','hindu','muslim','christian','sikh','jain','buddhist','jewish','other'],
  pets:     ['','dogs','cats','both','none','want some day'],
  children: ['','want some day','don\'t want','have & want more','have & don\'t want more','open'],
  education:['','high school','some college','bachelor\'s','master\'s','phd','trade school'],
};
const LOOKING_FOR_OPTIONS = ['casual','long-term','marriage','open','not sure yet','friendship','networking'];
const PROMPT_QUESTIONS = [
  'A perfect Sunday looks like…',
  'The way to win me over is…',
  'I get way too excited about…',
  'My simple pleasures…',
  'Two truths and a lie…',
  'I\'ll know I\'ve found the right person when…',
  'Dating me is like…',
  'My most controversial opinion is…',
  'I want someone who…',
  'Green flags I look for…',
];
// DTM catalogs
const RELIGIONS = ['Hindu','Muslim','Christian','Sikh','Jain','Buddhist','Parsi','Jewish','Spiritual','Other'];
const CASTES_BY_RELIGION: Record<string, string[]> = {
  Hindu: ['Brahmin','Iyer','Iyengar','Kshatriya','Vaishya','Maratha','Reddy','Naidu','Nair','Pillai','Open','Other'],
  Muslim: ['Sunni','Shia','Bohra','Khoja','Open','Other'],
  Christian: ['Catholic','Protestant','Orthodox','Syrian','Other'],
  Sikh: ['Jat','Khatri','Arora','Ramgarhia','Open','Other'],
  Jain: ['Digambar','Shwetambar','Other'],
};
const MANGLIK = ['No','Yes','Anshik (partial)','Don\'t know'];
const MARITAL = ['Never Married','Divorced','Widowed','Awaiting Divorce'];
const EDUCATION_LEVELS = ['High School','Diploma','Bachelor\'s','Master\'s','PhD','Professional','Other'];
const INCOME_BANDS = ['<5L','5-10L','10-20L','20-35L','35-50L','50-75L','75L-1Cr','1Cr+','Prefer not to say'];
const HEIGHTS = (() => { const out = []; for (let f = 4; f <= 6; f++) for (let i = 0; i <= 11; i++) out.push(`${f}'${i}"`); out.push("7'0\""); return out; })();
const MOTHER_TONGUES = ['Hindi','English','Tamil','Telugu','Kannada','Malayalam','Marathi','Gujarati','Bengali','Punjabi','Urdu','Odia','Assamese','Konkani','Sindhi','Other'];
const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const RAASIS = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
const FAMILY_TYPES = ['Nuclear','Joint','Extended'];
const FAMILY_VALUES = ['Traditional','Moderate','Liberal'];

// ─── small UI atoms ────────────────────────────────────────────
function VisibilityBadge({ v }: { v: 'PUBLIC' | 'MATCHES_ONLY' | 'REQUEST_ACCESS' }) {
  const map = {
    PUBLIC:         { label: 'Visible to everyone', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    MATCHES_ONLY:   { label: 'Only matches see this', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    REQUEST_ACCESS: { label: 'Released on access request', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  } as const;
  const m = map[v];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function ChipMulti({ options, value, onChange, max }: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const has = (o: string) => value.includes(o);
  const toggle = (o: string) => {
    if (has(o)) onChange(value.filter(v => v !== o));
    else if (!max || value.length < max) onChange([...value, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`rounded-full border px-3 py-1 text-xs transition ${has(o) ? 'border-rose-main bg-rose-main/10 text-rose-main' : 'border-token text-text-muted hover:border-rose-main/50'}`}>
          {o}
        </button>
      ))}
      {max && <span className="self-center text-[11px] text-text-muted">{value.length}/{max}</span>}
    </div>
  );
}

function Select({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-token bg-miamo-card px-3 py-2 text-sm">
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-token bg-miamo-card px-3 py-2 text-sm ${props.className ?? ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-[88px] w-full rounded-xl border border-token bg-miamo-card px-3 py-2 text-sm ${props.className ?? ''}`} />;
}

// ─── types ─────────────────────────────────────────────────────
interface Completion {
  score: number;
  threshold: number;
  dtm: boolean;
  missing: string[];
  buckets: Array<{
    key: string; label: string; hint: string;
    pts: number; earned: number; done: boolean;
    fields: string[];
    visibility: 'PUBLIC' | 'MATCHES_ONLY' | 'REQUEST_ACCESS';
  }>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [mp, setMp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.getCompletion(), api.getMyProfile()]);
      setCompletion(c.data);
      setProfile((p as any).data?.profile ?? null);
      setPhotos((p as any).data?.photos ?? []);
      setPrompts((p as any).data?.prompts ?? []);
      setInterests(((p as any).data?.interests ?? []).map((i: any) => i.name));
      if (c.data.dtm) {
        try { const m = await api.getMatrimonialProfile(); setMp((m as any).data ?? m); } catch {}
      }
    } catch (e) {
      console.error('[onboarding] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isDone = completion ? completion.score >= completion.threshold : false;

  // ─── savers (each one optimistically refreshes the completion bar) ──
  async function patchProfile(patch: Record<string, any>) {
    setSaving('profile');
    try { await api.updateProfile(patch); await load(); }
    finally { setSaving(null); }
  }
  async function patchMp(patch: Record<string, any>) {
    setSaving('mp');
    try { await api.updateMatrimonialProfile({ ...(mp ?? {}), ...patch }); await load(); }
    finally { setSaving(null); }
  }
  async function savePrompts(next: Array<{ question: string; answer: string }>) {
    setSaving('prompts');
    try {
      await api.updatePrompts(next.map((p, i) => ({ ...p, position: i })));
      await load();
    } finally { setSaving(null); }
  }
  async function saveInterests(next: string[]) {
    setSaving('interests');
    try { await api.updateInterests(next); await load(); }
    finally { setSaving(null); }
  }

  if (loading) {
    return <div className="mx-auto mt-16 max-w-2xl px-6 text-center text-text-muted">Loading your profile…</div>;
  }
  if (!completion) {
    return <div className="mx-auto mt-16 max-w-2xl px-6 text-center text-red-600">Couldn\u2019t load your profile.</div>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-10" data-mode={completion.dtm ? 'dtm' : 'casual'}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          {completion.dtm ? 'DTM Onboarding · Matrimony' : 'Discover Onboarding · Casual'}
        </p>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">
          Complete {completion.threshold}% to {completion.dtm ? 'unlock DTM features' : 'get started'}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {completion.dtm
            ? 'DTM is fully separate from your casual profile. Everything here is gated for serious matches — pick from lists wherever possible.'
            : 'Fill in your basics first. We use dropdowns and chips so it stays quick — no essays needed.'}
        </p>
      </header>

      {/* progress hero */}
      <section className="rounded-2xl border border-token bg-miamo-card p-5 shadow-soft">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completion</span>
          <span className="tabular-nums text-text-muted">{completion.score} / {completion.threshold} pts</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
          <div className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-rose-main'}`}
               style={{ width: `${Math.min(100, Math.round((completion.score / completion.threshold) * 100))}%` }} />
        </div>
        {isDone ? (
          <button onClick={() => router.push(completion.dtm ? '/dtm' : '/discover')}
            className="mt-4 w-full rounded-xl bg-rose-main py-2.5 text-sm font-medium text-white shadow-button">
            You\u2019re set — continue to {completion.dtm ? 'DTM' : 'Discover'}
          </button>
        ) : (
          <p className="mt-3 text-xs text-text-muted">
            You need <strong>{Math.max(0, completion.threshold - completion.score)} more pts</strong> to unlock {completion.dtm ? 'DTM matches' : 'matches & discover'}.
          </p>
        )}
      </section>

      {/* bucket cards */}
      <section className="mt-6 space-y-3">
        {completion.buckets.map(b => {
          const open = openKey === b.key;
          return (
            <article key={b.key}
              className={`rounded-2xl border ${b.done ? 'border-emerald-200 bg-emerald-50/30' : 'border-token bg-miamo-card'} transition`}>
              <button onClick={() => setOpenKey(open ? null : b.key)}
                className="flex w-full items-start gap-3 p-4 text-left">
                <div className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${b.done ? 'bg-emerald-500 text-white' : 'bg-rose-main/10 text-rose-main'}`}>
                  {b.done ? '✓' : <FieldIcon name={BUCKET_ICONS[b.key] ?? 'Tag'} className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{b.label}</span>
                    <span className="rounded-full bg-rose-main/10 px-2 py-0.5 text-[10px] font-medium text-rose-main">
                      +{b.pts} pts
                    </span>
                    <VisibilityBadge v={b.visibility} />
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">{b.hint}</div>
                </div>
                <div className="text-xs tabular-nums text-text-muted">{b.earned}/{b.pts}</div>
              </button>

              {open && (
                <div className="border-t border-token/60 p-4">
                  <BucketEditor
                    bucketKey={b.key}
                    profile={profile}
                    photos={photos}
                    prompts={prompts}
                    interests={interests}
                    mp={mp}
                    dtm={completion.dtm}
                    saving={saving}
                    onPatchProfile={patchProfile}
                    onPatchMp={patchMp}
                    onSavePrompts={savePrompts}
                    onSaveInterests={saveInterests}
                    onGoTo={(path) => router.push(path)}
                  />
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* Mode switch */}
      {!completion.dtm && (
        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
          <h3 className="text-sm font-medium">Looking for marriage?</h3>
          <p className="mt-1 text-xs text-text-muted">
            Switch on DTM to unlock the matrimony profile (family, education, horoscope). It\u2019s a fully separate flow — your casual profile stays as is.
          </p>
          <button onClick={() => patchProfile({ seriousMode: true })}
            className="mt-3 rounded-xl border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100">
            Enable DTM mode →
          </button>
        </section>
      )}
      {completion.dtm && (
        <section className="mt-8 rounded-2xl border border-token bg-miamo-card p-5">
          <h3 className="text-sm font-medium">Switch back to casual</h3>
          <p className="mt-1 text-xs text-text-muted">Your DTM details stay saved, but DTM features stop showing.</p>
          <button onClick={() => patchProfile({ seriousMode: false })}
            className="mt-3 rounded-xl border border-token bg-white px-3 py-1.5 text-xs font-medium text-text-muted hover:border-rose-main/50">
            Turn DTM off
          </button>
        </section>
      )}
    </main>
  );
}

// ─── per-bucket editor ────────────────────────────────────────
function BucketEditor(props: {
  bucketKey: string;
  profile: any;
  photos: any[];
  prompts: any[];
  interests: string[];
  mp: any;
  dtm: boolean;
  saving: string | null;
  onPatchProfile: (p: Record<string, any>) => Promise<void>;
  onPatchMp: (p: Record<string, any>) => Promise<void>;
  onSavePrompts: (next: Array<{ question: string; answer: string }>) => Promise<void>;
  onSaveInterests: (next: string[]) => Promise<void>;
  onGoTo: (path: string) => void;
}) {
  const { bucketKey, profile, photos, prompts, interests, mp, onPatchProfile, onPatchMp, onSavePrompts, onSaveInterests, onGoTo } = props;
  // local draft state per bucket
  const [draft, setDraft] = useState<any>(() => ({ ...profile, ...mp, interests, prompts }));
  useEffect(() => { setDraft({ ...profile, ...mp, interests, prompts }); }, [profile, mp, interests, prompts]);

  // ─── Casual buckets ─────────────────────────────────────────
  if (bucketKey === 'identity') {
    return (
      <div className="space-y-3">
        <label className="block text-xs font-medium">Age
          <TextInput type="number" min={18} max={99} value={draft.age ?? ''} onChange={e => setDraft({ ...draft, age: parseInt(e.target.value) || '' })} />
        </label>
        <label className="block text-xs font-medium">Gender
          <Select options={['woman','man','non-binary','prefer not to say']} value={draft.gender ?? ''} onChange={v => setDraft({ ...draft, gender: v })} />
        </label>
        <SaveRow onSave={() => onPatchProfile({ age: draft.age, gender: draft.gender })} />
      </div>
    );
  }
  if (bucketKey === 'city') {
    return (
      <div className="space-y-3">
        <label className="block text-xs font-medium">City
          <TextInput value={draft.city ?? ''} placeholder="e.g. Mumbai" onChange={e => setDraft({ ...draft, city: e.target.value })} />
        </label>
        <SaveRow onSave={() => onPatchProfile({ city: draft.city })} />
      </div>
    );
  }
  if (bucketKey === 'photos') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-text-muted">You have <strong>{photos.length}</strong> photos. Upload 4–6 for full points.</p>
        <button onClick={() => onGoTo('/profile')} className="rounded-xl bg-rose-main px-3 py-1.5 text-xs font-medium text-white shadow-button">
          Open photo manager →
        </button>
      </div>
    );
  }
  if (bucketKey === 'bio') {
    return (
      <div className="space-y-3">
        <TextArea value={draft.bio ?? ''} placeholder="A few honest sentences about you (40+ chars)" maxLength={500}
          onChange={e => setDraft({ ...draft, bio: e.target.value })} />
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>{(draft.bio ?? '').length} / 500 chars · need 40+</span>
        </div>
        <SaveRow onSave={() => onPatchProfile({ bio: draft.bio })} />
      </div>
    );
  }
  if (bucketKey === 'prompts') {
    const next = [...(draft.prompts ?? [])];
    while (next.length < 3) next.push({ question: '', answer: '' });
    return (
      <div className="space-y-3">
        {next.slice(0, 3).map((p: any, i: number) => (
          <div key={i} className="rounded-xl border border-token/60 p-3">
            <Select options={PROMPT_QUESTIONS} value={p.question ?? ''}
              onChange={v => { const arr = [...next]; arr[i] = { ...arr[i], question: v }; setDraft({ ...draft, prompts: arr }); }} />
            <TextInput className="mt-2" placeholder="Your one-line answer" value={p.answer ?? ''} maxLength={140}
              onChange={e => { const arr = [...next]; arr[i] = { ...arr[i], answer: e.target.value }; setDraft({ ...draft, prompts: arr }); }} />
          </div>
        ))}
        <SaveRow onSave={() => onSavePrompts(next.filter((p: any) => p.question && p.answer))} />
      </div>
    );
  }
  if (bucketKey === 'interests') {
    return (
      <div className="space-y-3">
        <ChipMulti options={INTEREST_OPTIONS} value={draft.interests ?? []} max={12}
          onChange={v => setDraft({ ...draft, interests: v })} />
        <SaveRow onSave={() => onSaveInterests(draft.interests ?? [])} />
      </div>
    );
  }
  if (bucketKey === 'lifestyle') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Height (cm)
          <TextInput type="number" min={120} max={230} value={draft.height ?? ''} onChange={e => setDraft({ ...draft, height: parseInt(e.target.value) || '' })} />
        </label>
        {Object.entries(LIFESTYLE_DROPDOWNS).map(([key, opts]) => (
          <label key={key} className="block text-xs font-medium capitalize">{key}
            <Select options={opts} value={draft[key] ?? ''} onChange={v => setDraft({ ...draft, [key]: v })} />
          </label>
        ))}
        <label className="block text-xs font-medium sm:col-span-2">Languages (comma separated)
          <TextInput value={draft.languages ?? ''} placeholder="English, Hindi…" onChange={e => setDraft({ ...draft, languages: e.target.value })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchProfile({
          height: draft.height, education: draft.education, languages: draft.languages, diet: draft.diet,
          drinking: draft.drinking, smoking: draft.smoking, exercise: draft.exercise, religion: draft.religion,
          pets: draft.pets, children: draft.children,
        })} /></div>
      </div>
    );
  }
  if (bucketKey === 'lookingFor') {
    return (
      <div className="space-y-3">
        <Select options={LOOKING_FOR_OPTIONS} value={draft.lookingFor ?? ''} onChange={v => setDraft({ ...draft, lookingFor: v })} />
        <SaveRow onSave={() => onPatchProfile({ lookingFor: draft.lookingFor })} />
      </div>
    );
  }
  if (bucketKey === 'profession') {
    return (
      <div className="space-y-3">
        <TextInput value={draft.profession ?? ''} placeholder="e.g. Product Designer" onChange={e => setDraft({ ...draft, profession: e.target.value })} />
        <SaveRow onSave={() => onPatchProfile({ profession: draft.profession })} />
      </div>
    );
  }
  if (bucketKey === 'verification') {
    return (
      <p className="text-xs text-text-muted">
        Email verification happens in <button onClick={() => onGoTo('/settings')} className="text-rose-main underline">Settings → Account</button>.
      </p>
    );
  }

  // ─── DTM buckets ────────────────────────────────────────────
  if (bucketKey === 'inherited' || bucketKey === 'dtm-photos') {
    return <p className="text-xs text-text-muted">These come from your Discover profile. <button onClick={() => onGoTo('/profile')} className="text-rose-main underline">Edit Discover profile</button>.</p>;
  }
  if (bucketKey === 'maritalStatus') {
    return (
      <div className="space-y-3">
        <Select options={MARITAL} value={draft.maritalStatus ?? ''} onChange={v => setDraft({ ...draft, maritalStatus: v })} />
        <SaveRow onSave={() => onPatchMp({ maritalStatus: draft.maritalStatus })} />
      </div>
    );
  }
  if (bucketKey === 'dtm-basics') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Date of birth
          <TextInput type="date" value={draft.dateOfBirth ? new Date(draft.dateOfBirth).toISOString().slice(0,10) : ''}
            onChange={e => setDraft({ ...draft, dateOfBirth: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Height
          <Select options={HEIGHTS} value={draft.height ?? ''} onChange={v => setDraft({ ...draft, height: v })} />
        </label>
        <label className="block text-xs font-medium sm:col-span-2">Mother tongue
          <Select options={MOTHER_TONGUES} value={draft.motherTongue ?? ''} onChange={v => setDraft({ ...draft, motherTongue: v })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ dateOfBirth: draft.dateOfBirth || null, height: draft.height, motherTongue: draft.motherTongue })} /></div>
      </div>
    );
  }
  if (bucketKey === 'community') {
    const castes = CASTES_BY_RELIGION[draft.religion as string] ?? ['Open','Other'];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Religion
          <Select options={RELIGIONS} value={draft.religion ?? ''} onChange={v => setDraft({ ...draft, religion: v, caste: '' })} />
        </label>
        <label className="block text-xs font-medium">Caste / community
          <Select options={castes} value={draft.caste ?? ''} onChange={v => setDraft({ ...draft, caste: v })} />
        </label>
        <label className="block text-xs font-medium">Sub-caste
          <TextInput value={draft.subCaste ?? ''} onChange={e => setDraft({ ...draft, subCaste: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Manglik
          <Select options={MANGLIK} value={draft.manglik ?? ''} onChange={v => setDraft({ ...draft, manglik: v })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ religion: draft.religion, caste: draft.caste, subCaste: draft.subCaste, manglik: draft.manglik })} /></div>
      </div>
    );
  }
  if (bucketKey === 'education') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Education level
          <Select options={EDUCATION_LEVELS} value={draft.education ?? ''} onChange={v => setDraft({ ...draft, education: v })} />
        </label>
        <label className="block text-xs font-medium">Field / specialisation
          <TextInput value={draft.educationDetail ?? ''} placeholder="CS, Economics, MBA…" onChange={e => setDraft({ ...draft, educationDetail: e.target.value })} />
        </label>
        <label className="block text-xs font-medium sm:col-span-2">College <span className="text-text-muted">(matches only)</span>
          <TextInput value={draft.college ?? ''} onChange={e => setDraft({ ...draft, college: e.target.value })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ education: draft.education, educationDetail: draft.educationDetail, college: draft.college })} /></div>
      </div>
    );
  }
  if (bucketKey === 'career') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Occupation
          <TextInput value={draft.occupation ?? ''} placeholder="e.g. Software Engineer" onChange={e => setDraft({ ...draft, occupation: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Working city
          <TextInput value={draft.workingCity ?? ''} onChange={e => setDraft({ ...draft, workingCity: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Company <span className="text-text-muted">(matches only)</span>
          <TextInput value={draft.company ?? ''} onChange={e => setDraft({ ...draft, company: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Annual income <span className="text-text-muted">(matches only)</span>
          <Select options={INCOME_BANDS} value={draft.annualIncome ?? ''} onChange={v => setDraft({ ...draft, annualIncome: v })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ occupation: draft.occupation, workingCity: draft.workingCity, company: draft.company, annualIncome: draft.annualIncome })} /></div>
      </div>
    );
  }
  if (bucketKey === 'family') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Father\u2019s occupation
          <TextInput value={draft.fatherOccupation ?? ''} onChange={e => setDraft({ ...draft, fatherOccupation: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Family type
          <Select options={FAMILY_TYPES} value={draft.familyType ?? ''} onChange={v => setDraft({ ...draft, familyType: v })} />
        </label>
        <label className="block text-xs font-medium">Family values
          <Select options={FAMILY_VALUES} value={draft.familyValues ?? ''} onChange={v => setDraft({ ...draft, familyValues: v })} />
        </label>
        <label className="block text-xs font-medium">Brothers
          <TextInput type="number" min={0} max={10} value={draft.brothers ?? 0} onChange={e => setDraft({ ...draft, brothers: parseInt(e.target.value) || 0 })} />
        </label>
        <label className="block text-xs font-medium">Sisters
          <TextInput type="number" min={0} max={10} value={draft.sisters ?? 0} onChange={e => setDraft({ ...draft, sisters: parseInt(e.target.value) || 0 })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ fatherOccupation: draft.fatherOccupation, familyType: draft.familyType, familyValues: draft.familyValues, brothers: draft.brothers, sisters: draft.sisters })} /></div>
      </div>
    );
  }
  if (bucketKey === 'aboutMe') {
    return (
      <div className="space-y-3">
        <TextArea value={draft.aboutMe ?? ''} maxLength={1000}
          placeholder="2–3 honest paragraphs about who you are, what you want, what matters to you (120+ chars)"
          onChange={e => setDraft({ ...draft, aboutMe: e.target.value })} />
        <div className="text-[11px] text-text-muted">{(draft.aboutMe ?? '').length} / 1000 chars · need 120+</div>
        <SaveRow onSave={() => onPatchMp({ aboutMe: draft.aboutMe })} />
      </div>
    );
  }
  if (bucketKey === 'aboutFamily') {
    return (
      <div className="space-y-3">
        <TextArea value={draft.aboutFamily ?? ''} maxLength={600}
          placeholder="A short paragraph about your family (80+ chars, matches only)"
          onChange={e => setDraft({ ...draft, aboutFamily: e.target.value })} />
        <div className="text-[11px] text-text-muted">{(draft.aboutFamily ?? '').length} / 600 chars · need 80+</div>
        <SaveRow onSave={() => onPatchMp({ aboutFamily: draft.aboutFamily })} />
      </div>
    );
  }
  if (bucketKey === 'partnerPrefs') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Min age
          <TextInput type="number" min={18} max={99} value={draft.partnerAgeMin ?? 21} onChange={e => setDraft({ ...draft, partnerAgeMin: parseInt(e.target.value) || 21 })} />
        </label>
        <label className="block text-xs font-medium">Max age
          <TextInput type="number" min={18} max={99} value={draft.partnerAgeMax ?? 35} onChange={e => setDraft({ ...draft, partnerAgeMax: parseInt(e.target.value) || 35 })} />
        </label>
        <label className="block text-xs font-medium">Min height
          <Select options={HEIGHTS} value={draft.partnerHeightMin ?? ''} onChange={v => setDraft({ ...draft, partnerHeightMin: v })} />
        </label>
        <label className="block text-xs font-medium">Max height
          <Select options={HEIGHTS} value={draft.partnerHeightMax ?? ''} onChange={v => setDraft({ ...draft, partnerHeightMax: v })} />
        </label>
        <label className="block text-xs font-medium">Partner religion
          <Select options={['Any', ...RELIGIONS]} value={draft.partnerReligion ?? ''} onChange={v => setDraft({ ...draft, partnerReligion: v })} />
        </label>
        <label className="block text-xs font-medium">Partner caste
          <TextInput value={draft.partnerCaste ?? ''} placeholder="Any / specific" onChange={e => setDraft({ ...draft, partnerCaste: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Partner mother tongue
          <Select options={['Any', ...MOTHER_TONGUES]} value={draft.partnerMotherTongue ?? ''} onChange={v => setDraft({ ...draft, partnerMotherTongue: v })} />
        </label>
        <label className="block text-xs font-medium">Manglik preference
          <Select options={['Any', ...MANGLIK]} value={draft.partnerManglik ?? ''} onChange={v => setDraft({ ...draft, partnerManglik: v })} />
        </label>
        <label className="block text-xs font-medium">Marital status
          <Select options={['Any', ...MARITAL]} value={draft.partnerMaritalStatus ?? ''} onChange={v => setDraft({ ...draft, partnerMaritalStatus: v })} />
        </label>
        <label className="block text-xs font-medium">Partner education
          <Select options={['Any', ...EDUCATION_LEVELS]} value={draft.partnerEducation ?? ''} onChange={v => setDraft({ ...draft, partnerEducation: v })} />
        </label>
        <label className="block text-xs font-medium">Partner occupation
          <TextInput value={draft.partnerOccupation ?? ''} placeholder="Any / specific" onChange={e => setDraft({ ...draft, partnerOccupation: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Partner income (annual)
          <Select options={['Any', ...INCOME_BANDS]} value={draft.partnerIncome ?? ''} onChange={v => setDraft({ ...draft, partnerIncome: v })} />
        </label>
        <label className="block text-xs font-medium">Partner diet
          <Select options={['Any','Vegetarian','Vegan','Non-vegetarian','Eggetarian','Jain']} value={draft.partnerDiet ?? ''} onChange={v => setDraft({ ...draft, partnerDiet: v })} />
        </label>
        <label className="block text-xs font-medium">Partner smoking
          <Select options={['Any','never','rarely','socially','often']} value={draft.partnerSmoking ?? ''} onChange={v => setDraft({ ...draft, partnerSmoking: v })} />
        </label>
        <label className="block text-xs font-medium">Partner drinking
          <Select options={['Any','never','rarely','socially','often']} value={draft.partnerDrinking ?? ''} onChange={v => setDraft({ ...draft, partnerDrinking: v })} />
        </label>
        <label className="block text-xs font-medium">Family type preference
          <Select options={['Any', ...FAMILY_TYPES]} value={draft.partnerFamilyType ?? ''} onChange={v => setDraft({ ...draft, partnerFamilyType: v })} />
        </label>
        <label className="block text-xs font-medium">Family values preference
          <Select options={['Any', ...FAMILY_VALUES]} value={draft.partnerFamilyValues ?? ''} onChange={v => setDraft({ ...draft, partnerFamilyValues: v })} />
        </label>
        <label className="block text-xs font-medium sm:col-span-2">Preferred cities (comma separated)
          <TextInput value={draft.partnerLocations ?? ''} placeholder="Bengaluru, Mumbai, Pune" onChange={e => setDraft({ ...draft, partnerLocations: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Open to relocate?
          <Select options={['yes','no','open']} value={draft.partnerRelocate ?? ''} onChange={v => setDraft({ ...draft, partnerRelocate: v })} />
        </label>
        <label className="block text-xs font-medium">Kids stance
          <Select options={['Any','want some','don\u2019t want','have & want more','have & don\u2019t want more','open']} value={draft.partnerChildren ?? ''} onChange={v => setDraft({ ...draft, partnerChildren: v })} />
        </label>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({
          partnerAgeMin: draft.partnerAgeMin, partnerAgeMax: draft.partnerAgeMax,
          partnerHeightMin: draft.partnerHeightMin, partnerHeightMax: draft.partnerHeightMax,
          partnerReligion: draft.partnerReligion, partnerCaste: draft.partnerCaste,
          partnerMotherTongue: draft.partnerMotherTongue, partnerManglik: draft.partnerManglik,
          partnerMaritalStatus: draft.partnerMaritalStatus,
          partnerEducation: draft.partnerEducation, partnerOccupation: draft.partnerOccupation,
          partnerIncome: draft.partnerIncome, partnerDiet: draft.partnerDiet,
          partnerSmoking: draft.partnerSmoking, partnerDrinking: draft.partnerDrinking,
          partnerFamilyType: draft.partnerFamilyType, partnerFamilyValues: draft.partnerFamilyValues,
          partnerLocations: draft.partnerLocations, partnerRelocate: draft.partnerRelocate,
          partnerChildren: draft.partnerChildren,
        })} /></div>
      </div>
    );
  }
  if (bucketKey === 'kundli') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium sm:col-span-2">Kundli URL (upload to drive / docs, paste link)
          <TextInput value={draft.kundliUrl ?? ''} placeholder="https://…" onChange={e => setDraft({ ...draft, kundliUrl: e.target.value })} />
        </label>
        <label className="block text-xs font-medium">Nakshatra (star)
          <Select options={NAKSHATRAS} value={draft.nakshatra ?? ''} onChange={v => setDraft({ ...draft, nakshatra: v, star: v })} />
        </label>
        <label className="block text-xs font-medium">Raasi (moon sign)
          <Select options={RAASIS} value={draft.raasi ?? ''} onChange={v => setDraft({ ...draft, raasi: v })} />
        </label>
        <div className="sm:col-span-2 text-[11px] text-text-muted">
          These fields are only released when someone sends an access request and you approve it.
        </div>
        <div className="sm:col-span-2"><SaveRow onSave={() => onPatchMp({ kundliUrl: draft.kundliUrl, nakshatra: draft.nakshatra, star: draft.nakshatra, raasi: draft.raasi })} /></div>
      </div>
    );
  }

  return <p className="text-xs text-text-muted">Edit this in Profile.</p>;
}

function SaveRow({ onSave }: { onSave: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex justify-end">
      <button disabled={busy} onClick={async () => { setBusy(true); try { await onSave(); } finally { setBusy(false); } }}
        className="rounded-xl bg-rose-main px-3 py-1.5 text-xs font-medium text-white shadow-button disabled:opacity-50">
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
