'use client';

/**
 * v3.6.0 — Family Brief modal (DTM tab).
 *
 * One-tap parent-shareable bio data. Bottom-sheet pattern (mirrors the
 * Discover PassFeedbackModal / MoveModal). Default format is "image" because
 * the primary distribution channel is WhatsApp. After the server returns a
 * share token + URL, the user can pick "Share to WhatsApp" (wa.me intent)
 * or "Copy link". Server emits `family_brief.generated` on POST; we also
 * fire `family_brief.shared` client-side via useTrackActivity once the user
 * actually shares or copies.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image as ImageIcon, Type, Share2, Copy, Check, ClipboardCheck } from 'lucide-react';
import { Portal } from '@/components/ui/portal';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackActivity } from '@/hooks/useTrackActivity';

type Format = 'pdf' | 'image' | 'text';

type GenerateResult = {
  token: string;
  url: string;
  expiresAt: string;
  note?: string;
};

const FORMATS: Array<{ id: Format; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'image', label: 'Image', hint: 'for WhatsApp', icon: ImageIcon },
  { id: 'pdf', label: 'PDF', hint: 'printable', icon: FileText },
  { id: 'text', label: 'Text', hint: 'paste anywhere', icon: Type },
];

/**
 * @param isOpen     — whether the bottom sheet is mounted.
 * @param onClose    — called when the user dismisses (overlay click, X, Esc).
 * @param previewBio — optional inline preview (matrimonial profile state)
 *                     used to render the bio data preview pane before the
 *                     server-side render is generated. Falls back to a
 *                     "Click Generate" placeholder when absent.
 */
export function FamilyBrief({
  isOpen,
  onClose,
  previewBio,
}: {
  isOpen: boolean;
  onClose: () => void;
  previewBio?: {
    displayName?: string | null;
    age?: number | null;
    city?: string | null;
    profession?: string | null;
    education?: string | null;
    religion?: string | null;
    familyBackground?: string | null;
    subCommunity?: string | null;
    expectedTimeline?: string | null;
  } | null;
}) {
  const [format, setFormat] = useState<Format>('image');
  const [trackViews, setTrackViews] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const trackActivity = useTrackActivity();

  // Reset state every time the sheet is reopened so an old token doesn't
  // linger after dismiss/reopen.
  useEffect(() => {
    if (isOpen) {
      setFormat('image');
      setTrackViews(false);
      setResult(null);
      setCopied(false);
      setGenerating(false);
    }
  }, [isOpen]);

  const absoluteShareUrl = result ? toAbsoluteUrl(result.url) : '';

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await api.generateFamilyBrief({ format, trackViews });
      setResult(res);
      // Server has already emitted family_brief.generated; we still fire an
      // additional client signal so dashboards that key on the client SDK
      // see the action without polling activity logs.
      trackActivity('family_brief.generated', 'family_brief', res.token, { format, trackViews });
      toast.success('Brief ready to share');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generate failed';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!result) return;
    const text = `Sharing my Miamo profile brief: ${absoluteShareUrl}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
    trackActivity('family_brief.shared', 'family_brief', result.token, { format, channel: 'whatsapp' });
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(absoluteShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      trackActivity('family_brief.shared', 'family_brief', result.token, { format, channel: 'copy' });
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-[60] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-[440px]"
            role="dialog"
            aria-modal="true"
            aria-label="Family Brief"
          >
            <div className="bg-miamo-card border border-border rounded-[20px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              {/* ─── Header ─── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="text-[14px] font-bold text-text-primary">Family Brief</p>
                  <p className="text-[11px] text-text-muted mt-0.5">Share your bio data with parents</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-miamo-surface flex items-center justify-center hover:bg-miamo-card transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {/* ─── Body (scrollable) ─── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Format toggles */}
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">Format</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => {
                      const Icon = f.icon;
                      const active = format === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFormat(f.id)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-[12px] font-semibold transition-all',
                            active
                              ? 'bg-rose-main/10 border-rose-main/40 text-rose'
                              : 'bg-miamo-surface border-border text-text-muted hover:border-rose-main/20',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{f.label}</span>
                          <span className="text-[9px] font-medium text-text-muted/80">{f.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Track-views toggle */}
                <label className="flex items-center justify-between gap-3 rounded-xl bg-miamo-surface border border-border px-4 py-3 cursor-pointer">
                  <div>
                    <p className="text-[12px] font-semibold text-text-primary">Track parent views</p>
                    <p className="text-[10px] text-text-muted mt-0.5">See when the link is opened</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={trackViews}
                    onClick={() => setTrackViews((v) => !v)}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors',
                      trackViews ? 'bg-rose-main' : 'bg-miamo-card border border-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                        trackViews ? 'translate-x-[18px]' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </label>

                {/* Preview pane */}
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">Preview</p>
                  <div className="rounded-xl bg-miamo-surface border border-border p-4 text-[12px] text-text-secondary leading-relaxed">
                    {previewBio ? (
                      <PreviewLines bio={previewBio} />
                    ) : (
                      <p className="text-text-muted italic">
                        Preview unavailable — click Generate to create your brief.
                      </p>
                    )}
                  </div>
                </div>

                {/* Result + share controls */}
                {result && (
                  <div className="rounded-xl bg-rose-main/5 border border-rose-main/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-rose" />
                      <p className="text-[12px] font-semibold text-text-primary">Share link ready</p>
                    </div>
                    <p className="text-[10px] text-text-muted break-all font-mono">{absoluteShareUrl}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="flex-1 h-9 rounded-lg bg-rose-main text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-rose-dark transition"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share to WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="h-9 px-3 rounded-lg bg-miamo-card border border-border text-[12px] font-semibold text-text-secondary flex items-center gap-1.5 hover:border-rose-main/30 transition"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-rose-alt" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] text-text-muted">
                      Expires {new Date(result.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* ─── Footer ─── */}
              <div className="px-5 py-3 border-t border-border bg-miamo-surface/40">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className={cn(
                    'w-full h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition',
                    generating
                      ? 'bg-miamo-surface text-text-secondary cursor-not-allowed'
                      : 'bg-rose-main text-white hover:bg-rose-dark shadow-soft',
                  )}
                >
                  {generating ? 'Generating…' : result ? 'Generate & Share again' : 'Generate & Share'}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function toAbsoluteUrl(relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  const base = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${relativeOrAbsolute}`;
}

function PreviewLines({ bio }: { bio: NonNullable<React.ComponentProps<typeof FamilyBrief>['previewBio']> }) {
  const rows: Array<[string, string | number | null | undefined]> = [
    ['Name', bio?.displayName],
    ['Age', bio?.age],
    ['City', bio?.city],
    ['Profession', bio?.profession],
    ['Education', bio?.education],
    ['Religion', bio?.religion],
    ['Community', bio?.subCommunity],
    ['Family', bio?.familyBackground],
    ['Timeline', bio?.expectedTimeline],
  ];
  const filled = rows.filter(([, v]) => v != null && v !== '');
  if (filled.length === 0) {
    return <p className="text-text-muted italic">No bio data on file yet — fill in your matrimonial profile first.</p>;
  }
  return (
    <ul className="space-y-1">
      {filled.map(([label, val]) => (
        <li key={label} className="flex gap-2">
          <span className="text-text-muted font-semibold min-w-[88px]">{label}</span>
          <span className="text-text-primary">{String(val)}</span>
        </li>
      ))}
    </ul>
  );
}
