'use client';
// v3.4 — Showcase composer. Local file upload (image/video) with compression
// or external URL, plus Spotlight minute spend so every post has a time budget.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link2, Tag, Sparkles, Loader2, ImagePlus, Film, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { CATEGORIES } from './constants';
import { Portal } from '@/components/ui/portal';
import { loadImageFromFile, compressImage, compressVideo, videoNeedsCompression } from '@/lib/media-utils';
import { MinutePicker, MIN_MINUTES, useSpotlight, PurchaseModal } from './SpotlightUI';

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
  const [mediaFile, setMediaFile] = useState<{ file: File; preview: string } | null>(null);
  const [mediaSource, setMediaSource] = useState<'upload' | 'url'>('upload');
  const [externalUrl, setExternalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [minutes, setMinutes] = useState(MIN_MINUTES);
  const [showBuy, setShowBuy] = useState(false);
  const { balance, refresh: refreshBalance, setBalance } = useSpotlight();

  useEffect(() => { if (open) refreshBalance(); }, [open, refreshBalance]);

  if (!open) return null;

  const totalMinutes = minutes * Math.max(1, cats.length);
  const insufficient = totalMinutes > balance;

  const toggleCat = (c: string) => {
    if (cats.includes(c)) setCats(cats.filter(x => x !== c));
    else if (cats.length < MAX_CATS) setCats([...cats, c]);
  };

  const canSubmit = title.trim().length > 2
    && (body.trim().length > 5 || mediaUrl.trim().length > 5 || !!mediaFile)
    && cats.length >= 1
    && !insufficient;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setErr(null);
    try {
      let finalMediaUrl: string | undefined;
      if (mediaSource === 'upload' && mediaFile) {
        if (mediaFile.file.type.startsWith('image/')) {
          const img = await loadImageFromFile(mediaFile.file);
          finalMediaUrl = await compressImage({ img, maxDim: 1080 });
        } else if (mediaFile.file.type.startsWith('video/')) {
          if (videoNeedsCompression(mediaFile.file)) {
            const result = await compressVideo({ file: mediaFile.file });
            finalMediaUrl = result.dataUrl;
          } else {
            const reader = new FileReader();
            finalMediaUrl = await new Promise<string>((r) => { reader.onload = () => r(reader.result as string); reader.readAsDataURL(mediaFile.file); });
          }
        }
      } else if (mediaSource === 'url' && mediaUrl.trim()) {
        finalMediaUrl = mediaUrl.trim();
      }
      const type = finalMediaUrl?.startsWith('data:video') ? 'video' : finalMediaUrl ? 'image' : externalUrl ? 'link' : 'text';
      const mediaType = type === 'video' ? 'video' : type === 'image' ? 'image' : 'text';
      const created = await Promise.all(cats.map((category) =>
        api.createCreativityItem({
          category, title: title.trim(),
          content: body.trim() + (externalUrl ? `\n\n${externalUrl}` : ''),
          mediaUrl: finalMediaUrl || undefined, type,
          mediaType,
          minutesPaid: minutes,
        })
      ));
      // Fetch fresh balance reflects all debits + bonuses.
      refreshBalance();
      onCreated(created.map((r) => r.data).filter(Boolean));
      setTitle(''); setBody(''); setCats([]); setMediaUrl(''); setMediaFile(null); setExternalUrl('');
      onClose();
    } catch (e: any) {
      const code = e?.body?.error?.code || e?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        setErr('Not enough Spotlight minutes — buy more or pick a smaller window.');
      } else {
        setErr(e?.message || 'Could not publish — try again.');
      }
    } finally { setBusy(false); }
  };

  return (
    <Portal>
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
              <p className="text-xs text-text-muted">Upload photos or videos — auto-compressed for fast loading.</p>
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

          {/* Media (upload or URL) */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 text-[11px] font-semibold">
              <button onClick={() => setMediaSource('upload')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition ${mediaSource === 'upload' ? 'border-rose-main text-rose-main bg-rose-main/10' : 'border-token text-text-muted'}`}>
                <ImagePlus className="h-3 w-3" /> Upload
              </button>
              <button onClick={() => setMediaSource('url')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition ${mediaSource === 'url' ? 'border-rose-main text-rose-main bg-rose-main/10' : 'border-token text-text-muted'}`}>
                <Link2 className="h-3 w-3" /> Paste URL
              </button>
            </div>
            {mediaSource === 'upload' ? (
              <div>
                {!mediaFile ? (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-token px-4 py-5 text-center hover:bg-black/[0.02] transition">
                    <div className="flex items-center justify-center gap-2 text-text-muted">
                      <ImagePlus className="h-5 w-5" /><Film className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-text-muted mt-1">Drop or click · image/video · auto-compressed</p>
                  </button>
                ) : (
                  <div className="relative inline-block">
                    {mediaFile.file.type.startsWith('image/') ? (
                      <img src={mediaFile.preview} alt="Preview" className="max-h-32 rounded-xl object-cover" />
                    ) : (
                      <video src={mediaFile.preview} className="max-h-32 rounded-xl" muted playsInline controls />
                    )}
                    <button onClick={() => { URL.revokeObjectURL(mediaFile.preview); setMediaFile(null); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (mediaFile?.preview) URL.revokeObjectURL(mediaFile.preview); setMediaFile({ file: f, preview: URL.createObjectURL(f) }); } e.target.value = ''; }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <ImageIcon className="inline h-3 w-3 -mt-0.5 mr-1" /> Image URL
                  <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                    placeholder="https://… (imgur, drive, etc.)"
                    className="mt-1 w-full rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-[13px] normal-case font-normal" />
                </label>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <Link2 className="inline h-3 w-3 -mt-0.5 mr-1" /> External link
                  <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                    placeholder="https://your-portfolio.com/piece"
                    className="mt-1 w-full rounded-xl border border-token bg-miamo-card px-3 py-2.5 text-[13px] normal-case font-normal" />
                </label>
              </div>
            )}
          </div>

          {err && <div className="mt-3 rounded-xl bg-rose-main/10 px-3 py-2 text-xs text-rose-main">{err}</div>}

          {/* Spotlight minute picker */}
          <div className="mt-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-3">
            <MinutePicker value={minutes} onChange={setMinutes} balance={balance} />
            {cats.length > 1 && (
              <p className="mt-2 text-[10px] text-amber-800">
                Cross-posting to {cats.length} categories → <strong className="tabular-nums">{totalMinutes} min</strong> total ({minutes} per post).
              </p>
            )}
            {insufficient && (
              <button
                type="button"
                onClick={() => setShowBuy(true)}
                className="mt-2 w-full rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white"
              >
                <Coins className="inline h-3.5 w-3.5 mr-1" /> Buy more Spotlight minutes
              </button>
            )}
          </div>

          <button onClick={submit} disabled={!canSubmit || busy}
            className="mt-4 mb-3 w-full rounded-xl bg-rose-main py-3 text-sm font-semibold text-white shadow-button disabled:opacity-50">
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> :
              cats.length > 1 ? `Publish to ${cats.length} categories → spend ${totalMinutes}m` : `Publish → spend ${minutes}m`}
          </button>
          <p className="text-center text-[11px] text-text-muted">
            <Sparkles className="inline h-3 w-3 mr-0.5" />
            People can send you a <strong>Miamo Move</strong> straight from your work.
          </p>
        </div>
      </motion.div>
      </AnimatePresence>
      <PurchaseModal
        open={showBuy}
        onClose={() => setShowBuy(false)}
        onPurchased={(b) => { setBalance(b); setShowBuy(false); }}
      />
    </Portal>
  );
}
