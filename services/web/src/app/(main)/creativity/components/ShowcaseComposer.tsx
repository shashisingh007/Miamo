'use client';
// v3.2 — Showcase composer. Text-first (title + body + category multi-select
// + optional external image/link URL). No video uploads → minimal storage.
// Each post can be tagged in up to 3 categories (server creates multiple
// CreativityItem rows, one per category, sharing the same title/body) so the
// same piece shows in every relevant feed.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link2, Tag, Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CATEGORIES } from './constants';

const MAX_TITLE = 80;
const MAX_BODY = 500;
const MAX_CATS = 3;

export function ShowcaseComposer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (created: any[]) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const toggleCat = (c: string) => {
    if (cats.includes(c)) setCats(cats.filter(x => x !== c));
    else if (cats.length < MAX_CATS) setCats([...cats, c]);
  };

  const canSubmit = title.trim().length > 2 && (body.trim().length > 5 || mediaUrl.trim().length > 5) && cats.length >= 1;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setErr(null);
    try {
      const type = mediaUrl ? 'image' : externalUrl ? 'link' : 'text';
      // One item per category — backend dedupes by (authorId, categoryId, title)
      // on its end if needed; we just fire in parallel.
      const created = await Promise.all(cats.map(category =>
        api.createCreativityItem({
          category, title: title.trim(),
          content: body.trim() + (externalUrl ? `\n\n${externalUrl}` : ''),
          mediaUrl: mediaUrl || undefined, type,
        })
      ));
      onCreated(created.map(r => r.data).filter(Boolean));
      setTitle(''); setBody(''); setCats([]); setMediaUrl(''); setExternalUrl('');
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Could not publish — try again.');
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-miamo-card pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-black/10 my-3" />
        <div className="mx-auto max-w-xl px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Showcase your talent</h2>
              <p className="text-xs text-text-muted">Text-first, low-bandwidth. Add an image URL if you like — no video uploads.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
          </div>

          {/* Title */}
          <div className="mt-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Title</label>
            <input value={title} maxLength={MAX_TITLE} onChange={e => setTitle(e.target.value)}
              placeholder="My first watercolor in 5 years"
              className="mt-1 w-full rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-sm" />
            <div className="mt-0.5 text-[10px] tabular-nums text-text-muted text-right">{title.length}/{MAX_TITLE}</div>
          </div>

          {/* Categories */}
          <div className="mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <Tag className="inline h-3 w-3 -mt-0.5 mr-1" />
              Categories <span className="text-text-muted/70">(pick up to {MAX_CATS})</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => c.id !== 'general').map(c => {
                const Icon = c.icon;
                const active = cats.includes(c.name);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCat(c.name)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active ? 'border-transparent text-white shadow-soft' : 'border-token text-text-muted hover:border-rose-main/40'
                    }`}
                    style={active ? { background: c.color } : undefined}
                  >
                    <Icon className="h-3 w-3" /> {c.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 text-[10px] text-text-muted">{cats.length}/{MAX_CATS} selected</div>
          </div>

          {/* Body */}
          <div className="mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Tell the story</label>
            <textarea value={body} maxLength={MAX_BODY} onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="What is it, why you made it, what makes it you…"
              className="mt-1 w-full resize-none rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-sm leading-relaxed" />
            <div className="mt-0.5 text-[10px] tabular-nums text-text-muted text-right">{body.length}/{MAX_BODY}</div>
          </div>

          {/* Image URL */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <ImageIcon className="inline h-3 w-3 -mt-0.5 mr-1" /> Image URL (optional)
              <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://… (host on imgur, drive, etc.)"
                className="mt-1 w-full rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-[13px] normal-case font-normal" />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <Link2 className="inline h-3 w-3 -mt-0.5 mr-1" /> External link (optional)
              <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                placeholder="https://your-portfolio.com/piece"
                className="mt-1 w-full rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-[13px] normal-case font-normal" />
            </label>
          </div>

          {err && <div className="mt-3 rounded-xl bg-rose-main/10 px-3 py-2 text-xs text-rose-main">{err}</div>}

          <button onClick={submit} disabled={!canSubmit || busy}
            className="mt-4 mb-3 w-full rounded-xl bg-rose-main py-3 text-sm font-semibold text-white shadow-button disabled:opacity-50">
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> :
              cats.length > 1 ? `Publish to ${cats.length} categories` : 'Publish showcase'}
          </button>
          <p className="text-center text-[11px] text-text-muted">
            <Sparkles className="inline h-3 w-3 mr-0.5" />
            People can send you a <strong>Miamo Move</strong> straight from your work.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
