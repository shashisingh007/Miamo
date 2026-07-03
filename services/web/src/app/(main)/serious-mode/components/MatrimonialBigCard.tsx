'use client';

// Date-to-Marry single-profile card. Pure matrimony UX — zero Discover bleed.
// Action row: Skip · Shortlist · Request (granular) · Send Proposal (formal).
// Proposal composer pulls 5 AI-suggested intro notes (style learned from the
// user's past sent moves + messages on the backend).

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  CheckCircle, Hash, GraduationCap, Briefcase, Building, Phone, Linkedin, Mail,
  Heart, Send, X, Star, Globe, Utensils, Users as UsersIcon, ScrollText,
  Languages, Moon, MapPin, Home, Sparkles, Bookmark, Loader2, FileText,
  Camera, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  profile: any;
  onView: () => void;
  /** Send formal matrimonial proposal (full bio-data access + personal note) */
  onProposal: (toUserId: string, message: string) => void | Promise<void>;
  /** Granular access ask (bioData / photos / phone / email / linkedin / horoscope) */
  onRequestAccess: (toUserId: string, type: string, message: string) => void | Promise<void>;
  onSkip: () => void;
  onShortlist: () => void | Promise<void>;
}

type Suggestion = { text: string; reasoning?: string; matchBackProbability?: number };

const ACCESS_TYPES: { id: string; label: string; hint: string; icon: any }[] = [
  { id: 'bioData',   label: 'Bio-Data',  hint: 'Full marriage bio-data PDF', icon: FileText },
  { id: 'photos',    label: 'Photos',    hint: 'Private album',              icon: Camera },
  { id: 'horoscope', label: 'Horoscope', hint: 'Janam kundli & charts',      icon: Moon },
  { id: 'phone',     label: 'Phone',     hint: 'Direct contact number',      icon: Phone },
  { id: 'email',     label: 'Email',     hint: 'Email address',              icon: Mail },
  { id: 'linkedin',  label: 'LinkedIn',  hint: 'Professional profile',       icon: Linkedin },
];

function Chip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] bg-rose-soft text-rose-dark rounded-full px-2.5 py-1 font-semibold border border-rose-light">
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-[12.5px]">
      <Icon className="w-3.5 h-3.5 text-rose-main mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-bold">{label}</p>
        <p className="text-zinc-700 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export function MatrimonialBigCard({ profile: p, onView, onProposal, onRequestAccess, onSkip, onShortlist }: Props) {
  const photo = p.user?.photos?.[0]?.url || p.user?.photos?.[0];
  const up = p.user?.profile || {};
  const gradient = up.avatarGradient || 'from-rose-alt to-rose-main';
  const targetUserId = p.user?.id || p.userId;

  const [shortlistPending, setShortlistPending] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const prompts: { q: string; a: string }[] = [
    p.aboutMe ? { q: 'About me', a: p.aboutMe } : null,
    p.partnerExpectations ? { q: 'Looking for', a: p.partnerExpectations } : null,
    p.familyValues ? { q: 'Family values', a: p.familyValues } : null,
    p.hobbies ? { q: 'Hobbies & interests', a: p.hobbies } : null,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="rounded-[20px] overflow-hidden bg-miamo-card border border-rose-light/60 shadow-[0_12px_48px_rgba(201,120,86,0.10)]"
      >
        {/* ── Hero Photo ───────────────────────────── */}
        <div className="relative aspect-[3/4] max-h-[560px] cursor-pointer overflow-hidden" onClick={onView}>
          {photo ? (
            <img src={photo} alt={p.fullName || ''} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-7xl font-bold text-white/85">{(p.fullName || p.user?.displayName || '?')[0]}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {p.idVerified && (
              <span className="bg-rose-main/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white">Verified</span>
              </span>
            )}
            {p.kundliVerified && (
              <span className="bg-purple-500/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                <Moon className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white">Kundli</span>
              </span>
            )}
          </div>

          {typeof p.numerologyScore === 'number' && p.numerologyScore >= 60 && (
            <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
              <Hash className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">{p.numerologyScore}% match</span>
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 px-6 pb-5">
            <h2 className="text-[26px] font-extrabold text-white leading-tight tracking-tight">
              {p.fullName || p.user?.displayName}{up.age ? `, ${up.age}` : ''}
            </h2>
            <p className="text-[13px] text-white/85 font-medium mt-0.5">
              {[p.height, p.workingCity, p.occupation].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* ── Body ───────────────────────────── */}
        <div className="p-5 space-y-5">

          <div className="flex flex-wrap gap-1.5">
            {p.religion && <Chip icon={ScrollText} label={p.religion} />}
            {p.caste && <Chip icon={UsersIcon} label={p.caste} />}
            {p.motherTongue && <Chip icon={Languages} label={p.motherTongue} />}
            {p.maritalStatus && <Chip icon={Heart} label={p.maritalStatus} />}
            {p.manglik === 'Yes' && <Chip icon={Star} label="Manglik" />}
            {p.diet && <Chip icon={Utensils} label={p.diet} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 pt-1">
            <Row icon={GraduationCap} label="Education" value={p.education} />
            <Row icon={Briefcase} label="Profession" value={[p.occupation, p.company].filter(Boolean).join(' · ')} />
            <Row icon={Building} label="Annual income" value={p.annualIncome && p.annualIncome !== 'Not specified' ? `₹${p.annualIncome}` : null} />
            <Row icon={Home} label="Family" value={[p.familyType, p.familyStatus].filter(Boolean).join(' · ') || null} />
            <Row icon={MapPin} label="Hometown" value={p.hometown || p.nativeCity} />
            <Row icon={Globe} label="Languages" value={Array.isArray(p.languages) ? p.languages.join(', ') : p.languages} />
          </div>

          {prompts.length > 0 && (
            <div className="space-y-3 pt-1">
              {prompts.slice(0, 3).map((pr, i) => (
                <div key={i} className="bg-rose-soft/40 border border-rose-light/50 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-rose-dark font-bold">{pr.q}</p>
                  <p className="text-[13px] text-zinc-800 mt-1.5 leading-relaxed">{pr.a}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 border-t border-rose-light/40">
            <span className="flex items-center gap-1.5 pt-3"><Phone className={`w-3.5 h-3.5 ${p.hasPhone ? 'text-rose-main' : 'text-zinc-300'}`} />Phone</span>
            <span className="flex items-center gap-1.5 pt-3"><Linkedin className={`w-3.5 h-3.5 ${p.hasLinkedIn ? 'text-rose-main' : 'text-zinc-300'}`} />LinkedIn</span>
            <span className="flex items-center gap-1.5 pt-3"><Mail className={`w-3.5 h-3.5 ${p.hasEmail ? 'text-rose-main' : 'text-zinc-300'}`} />Email</span>
            <div className="flex-1" />
            <button onClick={onView} className="text-[11px] font-semibold text-rose-main hover:text-rose-dark pt-3">View full bio-data →</button>
          </div>

          {/* Action row — 4 matrimony-native buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <ActionBtn
              onClick={onSkip}
              icon={<X className="w-4 h-4" />}
              label="Skip"
              hint="Pass for now"
              tone="neutral"
            />
            <ActionBtn
              onClick={async () => {
                setShortlistPending(true);
                try { await onShortlist(); setShortlisted(true); } finally { setShortlistPending(false); }
              }}
              disabled={shortlistPending || shortlisted}
              icon={<Bookmark className={`w-4 h-4 ${shortlisted ? 'fill-amber-500' : ''}`} />}
              label={shortlisted ? 'Saved' : shortlistPending ? '…' : 'Shortlist'}
              hint="Revisit later"
              tone="amber"
            />
            <ActionBtn
              onClick={() => setRequestOpen(true)}
              disabled={!targetUserId}
              icon={<Lock className="w-4 h-4" />}
              label="Request"
              hint="Bio-data, photos, etc."
              tone="rose-soft"
            />
            <ActionBtn
              onClick={() => setProposalOpen(true)}
              disabled={proposalSent || !targetUserId}
              icon={<Send className="w-4 h-4" />}
              label={proposalSent ? 'Sent' : 'Proposal'}
              hint="Formal interest"
              tone="rose-strong"
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 pt-1">
            <Sparkles className="w-3 h-3" /> DTM is a serious, slower lane — take your time.
          </div>
        </div>
      </motion.div>

      <ProposalComposer
        open={proposalOpen}
        targetUserId={targetUserId}
        targetName={p.fullName || p.user?.displayName || ''}
        onClose={() => setProposalOpen(false)}
        onSend={async (text) => {
          if (!targetUserId) return;
          await onProposal(targetUserId, text);
          setProposalSent(true);
          setProposalOpen(false);
        }}
      />

      <RequestAccessMenu
        open={requestOpen}
        targetUserId={targetUserId}
        targetName={p.fullName || p.user?.displayName || ''}
        onClose={() => setRequestOpen(false)}
        onSend={async (type, text) => {
          if (!targetUserId) return;
          await onRequestAccess(targetUserId, type, text);
          setRequestOpen(false);
        }}
      />
    </>
  );
}

// ─── Action button (4 tones) ──────────────────────────
function ActionBtn({
  onClick, disabled, icon, label, hint, tone,
}: {
  onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string; hint: string;
  tone: 'neutral' | 'amber' | 'rose-soft' | 'rose-strong';
}) {
  const cls = {
    'neutral':     'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800',
    'amber':       'border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100',
    'rose-soft':   'border-rose-light bg-rose-soft text-rose-dark hover:bg-rose-light',
    'rose-strong': 'border-transparent bg-gradient-to-r from-rose-main to-rose-dark text-white shadow-button hover:shadow-lg',
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-0.5 h-16 rounded-xl border text-[11px] font-bold disabled:opacity-50 transition ${cls}`}
    >
      {icon}
      <span className="leading-none">{label}</span>
      <span className={`text-[9px] font-medium leading-none ${tone === 'rose-strong' ? 'text-white/80' : 'opacity-70'}`}>{hint}</span>
    </button>
  );
}

// ─── Proposal composer (AI-suggested intro notes) ─────
function ProposalComposer({
  open, targetUserId, targetName, onClose, onSend,
}: {
  open: boolean;
  targetUserId: string | undefined;
  targetName: string;
  onClose: () => void;
  onSend: (text: string) => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !targetUserId) return;
    let cancelled = false;
    setLoadingSuggestions(true);
    setSuggestions([]);
    api.getMoveSuggestions(targetUserId)
      .then((res: any) => { if (!cancelled) setSuggestions((res?.data || []).slice(0, 5)); })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });
    return () => { cancelled = true; };
  }, [open, targetUserId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-rose-light/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-light/40 bg-gradient-to-r from-rose-soft/50 to-white">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] text-rose-dark font-bold flex items-center gap-1.5"><Send className="w-3 h-3" /> Send Proposal</p>
                <p className="text-[14px] font-bold text-zinc-800 truncate">to {targetName || 'them'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-rose-soft/40 border border-rose-light/50 rounded-xl px-3.5 py-3 text-[12px] text-zinc-700 leading-relaxed">
                A proposal is a formal expression of marital interest. They'll receive a notification, your personal note, and the option to share full bio-data with you.
              </div>

              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-rose-main" />
                  AI-suggested intro notes
                  <span className="font-normal text-zinc-400 normal-case tracking-normal">— learned from your past notes</span>
                </p>
                {loadingSuggestions ? (
                  <div className="flex items-center justify-center py-8 text-zinc-400 text-[12px]">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Crafting suggestions…
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-[12px] text-zinc-400 italic py-4 text-center">Write your own note below.</p>
                ) : (
                  <div className="space-y-1.5">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setText(s.text)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                          text === s.text
                            ? 'bg-rose-soft border-rose-main'
                            : 'bg-zinc-50/60 border-zinc-200 hover:bg-rose-soft/50 hover:border-rose-light'
                        }`}
                      >
                        <p className="text-[12.5px] text-zinc-800 leading-relaxed">{s.text}</p>
                        {s.reasoning && (
                          <p className="text-[10px] text-zinc-400 mt-1 leading-tight italic">{s.reasoning}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Your note</p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="A respectful, personal note explaining why you'd like to connect for marriage…"
                  className="w-full h-28 rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-rose-main focus:outline-none resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-zinc-400 mt-1 text-right">{text.length}/500</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-rose-light/40 bg-zinc-50/50">
              <button
                onClick={onClose}
                className="px-4 h-10 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-[12.5px] font-semibold hover:bg-zinc-50"
              >Cancel</button>
              <div className="flex-1" />
              <button
                disabled={sending || !text.trim() || !targetUserId}
                onClick={async () => {
                  if (!targetUserId || !text.trim()) return;
                  setSending(true);
                  try { await onSend(text.trim()); }
                  finally { setSending(false); }
                }}
                className="px-5 h-10 rounded-xl bg-gradient-to-r from-rose-main to-rose-dark text-white text-[12.5px] font-bold shadow-button hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending…' : 'Send proposal'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Granular access request menu ─────────────────────
function RequestAccessMenu({
  open, targetUserId, targetName, onClose, onSend,
}: {
  open: boolean;
  targetUserId: string | undefined;
  targetName: string;
  onClose: () => void;
  onSend: (type: string, text: string) => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);
  const [type, setType] = useState<string>('bioData');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  // reset on open
  useEffect(() => { if (open) { setType('bioData'); setText(''); } }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-rose-light/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-light/40 bg-gradient-to-r from-rose-soft/50 to-white">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] text-rose-dark font-bold flex items-center gap-1.5"><Lock className="w-3 h-3" /> Request Access</p>
                <p className="text-[14px] font-bold text-zinc-800 truncate">from {targetName || 'them'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-[12px] text-zinc-600 leading-relaxed">
                Choose what you'd like to access. They can grant or deny per item; granted access lasts ~30 days.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {ACCESS_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`flex items-start gap-2.5 px-3 py-3 rounded-xl border text-left transition ${
                        active
                          ? 'bg-rose-soft border-rose-main'
                          : 'bg-zinc-50/60 border-zinc-200 hover:bg-rose-soft/40 hover:border-rose-light'
                      }`}
                    >
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${active ? 'bg-rose-main text-white' : 'bg-white border border-zinc-200 text-rose-main'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-bold text-zinc-800 leading-tight">{t.label}</p>
                        <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-tight">{t.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Add a short reason <span className="font-normal text-zinc-400 normal-case">(optional)</span></p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Helps them decide — e.g. 'My family is keen to discuss horoscopes before next steps.'"
                  className="w-full h-20 rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-rose-main focus:outline-none resize-none"
                  maxLength={300}
                />
                <p className="text-[10px] text-zinc-400 mt-1 text-right">{text.length}/300</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-rose-light/40 bg-zinc-50/50">
              <button
                onClick={onClose}
                className="px-4 h-10 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-[12.5px] font-semibold hover:bg-zinc-50"
              >Cancel</button>
              <div className="flex-1" />
              <button
                disabled={sending || !targetUserId}
                onClick={async () => {
                  if (!targetUserId) return;
                  setSending(true);
                  try { await onSend(type, text.trim()); }
                  finally { setSending(false); }
                }}
                className="px-5 h-10 rounded-xl bg-gradient-to-r from-rose-main to-rose-dark text-white text-[12.5px] font-bold shadow-button hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
