'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 HeartHandshake, Shield, CheckCircle, Users, Lock, Eye, EyeOff,
 Phone, Linkedin, Mail, FileText, Star, Crown, Sparkles,
 Search, Filter, ChevronRight, ChevronDown, X, Check,
 MapPin, Briefcase, GraduationCap, Heart, Home, Clock,
 Download, Palette, Send, AlertTriangle, UserCheck, Gem,
 ScrollText, Camera, Globe, ArrowRight, ArrowLeft, Info,
 Building, Utensils, Wine, Cigarette, Moon, Sun, Baby,
 Menu, MessageCircle, Settings, BarChart3, Upload, Zap,
 ChevronLeft, Hash, Percent, Activity, BookOpen,
 ShieldCheck, ShieldX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Select, Input, Field, Textarea } from './components/FormWidgets';
import { loadImageFromFile, compressImage, compressVideo, videoNeedsCompression } from '@/lib/media-utils';
import { DtmShortcutBar } from './components/DtmShortcutBar';

import {
 RELIGIONS, CASTES_BY_RELIGION, MOTHER_TONGUES, HEIGHTS, EDUCATION_LEVELS,
 INCOMES, FAMILY_TYPES, FAMILY_STATUS, FAMILY_VALUES, MARITAL_STATUSES,
 DIETS, MANGLIK_OPTIONS, COMPLEXIONS, BODY_TYPES, NAKSHATRAS, RAASHIS,
 TEMPLATES,
} from './components/constants';
import { BioDataPreview } from './components/BioDataPreview';
import { MatrimonialCard } from './components/MatrimonialCard';
import { MatrimonialBigCard } from './components/MatrimonialBigCard';
import { ProfileDetailModal } from './components/ProfileDetailModal';
import { CompatibilityModal } from './components/CompatibilityModal';
import { ProfileEditor } from './components/ProfileEditor';

/* ═══════════════════════════════════════════════════════════
 SIDEBAR MENU — DTM sections (3-bar menu)
 ═══════════════════════════════════════════════════════════ */
const DTM_SECTIONS = [
 { id: 'browse', label: 'Browse Profiles', icon: Search, color: 'text-rose-main' },
 { id: 'profile', label: 'My Profile / Bio Data', icon: FileText, color: 'text-rose-main' },
 { id: 'matches', label: 'My Matches', icon: Heart, color: 'text-rose' },
 { id: 'numerology', label: 'Numerology', icon: Hash, color: 'text-rose-main' },
 { id: 'kundli', label: 'Kundli / Horoscope', icon: Moon, color: 'text-rose-main' },
 { id: 'chat', label: 'DTM Chat', icon: MessageCircle, color: 'text-rose-main' },
 { id: 'access', label: 'Access Control', icon: Shield, color: 'text-rose-main' },
 { id: 'preferences', label: 'Partner Preferences', icon: Heart, color: 'text-rose' },
 { id: 'privacy', label: 'Privacy & Security', icon: Lock, color: 'text-zinc-500' },
 { id: 'templates', label: 'Bio Data Templates', icon: Palette, color: 'text-rose-main' },
] as const;
type SectionId = typeof DTM_SECTIONS[number]['id'];

/* ═══════════════════════════════════════════════════════════
 MAIN PAGE COMPONENT
 ═══════════════════════════════════════════════════════════ */
export default function DateToMarryPage() {
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [saveMsg, setSaveMsg] = useState('');
 const [section, setSection] = usePersistentState<SectionId>('dtm:section', 'browse');
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [profileEnabled, setProfileEnabled] = useState(false);

 useTrackPageView('serious-mode');
 useTrackScrollDepth('serious-mode');

 // Data
 const [myProfile, setMyProfile] = useState<any>(null);
 const [browseProfiles, setBrowseProfiles] = useState<any[]>([]);
 const [matches, setMatches] = useState<any[]>([]);
 const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
 const [sentRequests, setSentRequests] = useState<any[]>([]);
 const [selectedProfile, setSelectedProfile] = useState<any>(null);
 const [compatData, setCompatData] = useState<any>(null);
 const [numerologyData, setNumerologyData] = useState<any>(null);
 const [dtmChats, setDtmChats] = useState<any[]>([]);
 const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
 const [chatMessages, setChatMessages] = useState<any[]>([]);
 const [chatInput, setChatInput] = useState('');
 const [dtmAttachedFile, setDtmAttachedFile] = useState<{ file: File; preview: string; type: string } | null>(null);
 const [dtmSending, setDtmSending] = useState(false);
 const [showPreview, setShowPreview] = useState(false);
 const [previewTemplate, setPreviewTemplate] = useState('');

 // Filters
 const [filters, setFilters] = usePersistentState<Record<string, string>>('dtm:filters', {});
 const [showFilters, setShowFilters] = useState(false);

 // Lock body scroll while filter drawer is open
 useEffect(() => {
  if (!showFilters) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFilters(false); };
  window.addEventListener('keydown', onKey);
  return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
 }, [showFilters]);

 const [bioDataStep, setBioDataStep] = usePersistentState<number>('dtm:bioDataStep', 0);
 const [matchTab, setMatchTab] = usePersistentState<'matches' | 'incoming' | 'hold'>('dtm:matchTab', 'matches');
 const [currentDtmIndex, setCurrentDtmIndex] = usePersistentState<number>('dtm:currentIndex', 0);

 // Profile completion — uses the canonical /api/v1/profiles/me/completion
 // score (DTM scoring kicks in when Profile.seriousMode = true; gate = 75).
 const [profileCompletion, setProfileCompletion] = useState(0);
 const DTM_GATE = 75;
 useEffect(() => {
   let mounted = true;
   const refresh = () => api.getCompletion().then((c: any) => {
     if (mounted && typeof c?.data?.score === 'number') setProfileCompletion(c.data.score);
   }).catch(() => {});
   refresh();
   const t = setInterval(refresh, 8000);
   return () => { mounted = false; clearInterval(t); };
 }, [myProfile]);

 const pendingRequestCount = useMemo(() => incomingRequests.filter(r => r.status === 'pending').length, [incomingRequests]);

 // Clamp persisted card index whenever the browse list changes (filters / refresh)
 useEffect(() => {
   setCurrentDtmIndex((i) => (browseProfiles.length === 0 ? 0 : Math.min(i, browseProfiles.length - 1)));
 }, [browseProfiles, setCurrentDtmIndex]);

 // Load data
 useEffect(() => {
 Promise.all([
 api.getMatrimonialProfile().catch(() => ({ data: null })),
 api.browseMatrimonialAdvanced({ limit: 10 }).catch(() => api.browseMatrimonial({ limit: 10 }).catch(() => ({ data: [] }))),
 api.getMatrimonialMatches().catch(() => ({ data: [] })),
 api.getIncomingAccessRequests().catch(() => ({ data: [] })),
 api.getSentAccessRequests().catch(() => ({ data: [] })),
 api.getDtmChats().catch(() => ({ data: [] })),
 ]).then(([profileRes, browseRes, matchRes, incRes, sentRes, chatRes]) => {
 if (profileRes.data) {
 setMyProfile(profileRes.data);
 setProfileEnabled(!!profileRes.data.fullName);
 }
 setBrowseProfiles(browseRes.data || []);
 setMatches(matchRes.data || []);
 setIncomingRequests(incRes.data || []);
 setSentRequests(sentRes.data || []);
 setDtmChats(chatRes.data || []);
 }).finally(() => setLoading(false));
 }, []);

 const updateField = useCallback((key: string, value: any) => {
 setMyProfile((prev: any) => prev ? { ...prev, [key]: value } : prev);
 }, []);

 const saveProfile = useCallback(async () => {
 if (!myProfile || saving) return;
 setSaving(true);
 try {
 const res = await api.updateMatrimonialProfile(myProfile);
 if (res.data) { setMyProfile(res.data); setProfileEnabled(!!res.data.fullName); }
 setSaveMsg('Profile saved!');
 setTimeout(() => setSaveMsg(''), 3000);
 } catch { setSaveMsg('Failed to save'); }
 finally { setSaving(false); }
 }, [myProfile, saving]);

 const applyFilters = useCallback(async () => {
 try {
 const res = await api.browseMatrimonialAdvanced({ ...filters, limit: 10 }).catch(() => api.browseMatrimonial({ ...filters, limit: 10 }));
 setBrowseProfiles(res.data || []);
 } catch {}
 }, [filters]);

 // v6.7: refresh DTM top-10 — each call re-runs scoreDtm + scoreDtmEnhanced
 // with freshly-aggregated behavioral signals (recent views, completeness,
 // active days, response rate). The cursor moves so the next batch is
 // genuinely different rather than re-ranking the same head.
 const [dtmCursor, setDtmCursor] = useState<string | null>(null);
 const [dtmRefreshing, setDtmRefreshing] = useState(false);
 const refreshDtmTopTen = useCallback(async () => {
 if (dtmRefreshing) return;
 setDtmRefreshing(true);
 try {
 const params: any = { ...filters, limit: 10 };
 if (dtmCursor) params.cursor = dtmCursor;
 const res = await api.browseMatrimonialAdvanced(params).catch(() => api.browseMatrimonial(params));
 const data = res.data || [];
 if (data.length === 0) {
 // wrap around to the freshest scoring of the head of the pool
 const wrap = await api.browseMatrimonialAdvanced({ ...filters, limit: 10 }).catch(() => api.browseMatrimonial({ ...filters, limit: 10 }));
 setBrowseProfiles(wrap.data || []);
 setDtmCursor((wrap as any).cursor || null);
 } else {
 setBrowseProfiles(data);
 setDtmCursor((res as any).cursor || null);
 }
 try { (await import('@/lib/track')).track('dtm.batch.refreshed', { count: data.length }); } catch {}
 } catch {}
 finally { setDtmRefreshing(false); }
 }, [dtmRefreshing, dtmCursor, filters]);

 const viewProfile = useCallback(async (userId: string) => {
 try { const res = await api.getMatrimonialUserProfile(userId); setSelectedProfile(res.data); } catch {}
 }, []);

 const checkCompatibility = useCallback(async (userId: string) => {
 try { const res = await api.getMatrimonialCompatibility(userId); setCompatData(res.data); } catch { setSaveMsg('Need DOB for compatibility'); setTimeout(() => setSaveMsg(''), 3000); }
 }, []);

 const handleAccessAction = useCallback(async (id: string, action: 'grant' | 'deny' | 'revoke') => {
 try {
 await api.handleAccessRequest(id, action);
 setIncomingRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'grant' ? 'granted' : action === 'deny' ? 'denied' : 'revoked' } : r));
 // Server mirrors the decision as a system DtmMessage — refresh open chat thread + chat list so it appears.
 const refreshes: Promise<any>[] = [api.getDtmChats().catch(() => ({ data: [] as any[] }))];
 if (activeChatUserId) refreshes.push(api.getDtmChatMessages(activeChatUserId).catch(() => ({ data: [] as any[] })));
 const [chatsRes, msgsRes] = await Promise.all(refreshes);
 setDtmChats((chatsRes as any).data || []);
 if (msgsRes) setChatMessages((msgsRes as any).data || []);
 } catch {}
 }, [activeChatUserId]);

 const requestAccess = useCallback(async (type: string) => {
 if (!selectedProfile) return;
 try {
 await api.requestAccess(selectedProfile.user?.id || selectedProfile.userId, type, 'I would like to view your ' + type);
 setSaveMsg('Access request sent!');
 setTimeout(() => setSaveMsg(''), 3000);
 } catch (e) {
 logError('seriousMode.requestAccess', e);
 setSaveMsg('Could not send access request. Try again.');
 setTimeout(() => setSaveMsg(''), 3000);
 }
 }, [selectedProfile]);

 const loadNumerology = useCallback(async () => {
 try { const res = await api.getMatrimonialNumerology(); setNumerologyData(res.data); } catch {}
 }, []);

 const sendChatMessage = useCallback(async () => {
 if ((!chatInput.trim() && !dtmAttachedFile) || !activeChatUserId) return;
 setDtmSending(true);
 try {
 let msgContent = chatInput.trim();
 let msgType = 'text';
 if (dtmAttachedFile) {
 // Compress media before sending
 if (dtmAttachedFile.file.type.startsWith('image/')) {
 const img = await loadImageFromFile(dtmAttachedFile.file);
 msgContent = await compressImage({ img, maxDim: 1080 });
 msgType = 'image';
 } else if (dtmAttachedFile.file.type.startsWith('video/')) {
 if (videoNeedsCompression(dtmAttachedFile.file)) {
 const result = await compressVideo({ file: dtmAttachedFile.file });
 msgContent = result.dataUrl;
 } else {
 const reader = new FileReader();
 msgContent = await new Promise<string>((r) => { reader.onload = () => r(reader.result as string); reader.readAsDataURL(dtmAttachedFile.file); });
 }
 msgType = 'video';
 }
 }
 const res = await api.sendDtmMessage(activeChatUserId, msgContent, msgType);
 if (res.data) setChatMessages(prev => [...prev, res.data]);
 setChatInput('');
 setDtmAttachedFile(null);
 } catch {}
 setDtmSending(false);
 }, [chatInput, activeChatUserId, dtmAttachedFile]);

 const openChat = useCallback(async (userId: string) => {
 setActiveChatUserId(userId);
 try { const res = await api.getDtmChatMessages(userId); setChatMessages(res.data || []); } catch {}
 setSection('chat');
 }, []);

 if (loading) return <MiamoLoader text="Loading Date to Marry..." />;

 // First time — enable profile gate
 if (!profileEnabled && section !== 'browse') {
 return (
 <div className="min-h-full bg-gradient-to-br from-rose-soft via-white to-rose-soft flex items-center justify-center p-6">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
 className="bg-miamo-card rounded-3xl border border-zinc-200 shadow-xl max-w-md w-full p-8 text-center space-y-5">
 <div className="text-5xl">🕉</div>
 <h2 className="text-xl font-bold text-zinc-900">Welcome to Date to Marry</h2>
 <p className="text-sm text-zinc-500">Build your matrimonial profile to access all features. Complete at least {DTM_GATE}% to enable browsing & matching.</p>
 <div className="w-full bg-zinc-100 rounded-full h-3">
 <div className="h-full bg-gradient-to-r from-rose-alt to-rose-alt rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
 </div>
 <p className="text-xs text-zinc-400">{profileCompletion}% complete • Need {DTM_GATE}% minimum</p>
 <button onClick={() => { setProfileEnabled(true); setSection('profile'); }}
 className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-main to-rose-main text-text-primary font-bold text-sm hover:shadow-lg transition">
 {profileCompletion >= DTM_GATE ? 'Enter Date to Marry' : 'Build Your Profile First'} →
 </button>
 <button onClick={() => { setProfileEnabled(true); setSection('browse'); }}
 className="text-xs text-zinc-400 hover:text-zinc-600 transition">or browse profiles first →</button>
 </motion.div>
 </div>
 );
 }

 return (
 <ErrorBoundary>
 <div className="min-h-full bg-gradient-to-br from-rose-soft/50 via-white to-rose-soft/50">
 {/* HEADER */}
 <div className="sticky top-0 z-30 bg-miamo-card/80 backdrop-blur-xl border-b border-zinc-200/60">
 <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
 <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
 <Menu className="w-5 h-5 text-zinc-700" />
 </button>
 <div className="flex items-center gap-2.5 flex-1">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-main to-rose-main flex items-center justify-center shadow-lg shadow-rose-light">
 <HeartHandshake className="w-5 h-5 text-text-primary" />
 </div>
 <div>
 <h1 className="text-base font-bold text-zinc-900">Date to Marry</h1>
 <p className="text-[10px] text-zinc-400">Find your life partner</p>
 </div>
 </div>
 {profileCompletion < DTM_GATE && (
 <button onClick={() => setSection('profile')} className="text-[10px] bg-rose-soft text-rose-dark px-3 py-1.5 rounded-lg font-semibold border border-rose-light hover:bg-rose-soft transition">
 Complete Profile ({profileCompletion}%)
 </button>
 )}
 </div>
 </div>

 {/* SIDEBAR */}
 <AnimatePresence>
 {sidebarOpen && (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
 <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25 }}
 className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-miamo-card border-r border-zinc-200 shadow-2xl overflow-y-auto">
 <div className="p-5 border-b border-zinc-100">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-main to-rose-main flex items-center justify-center">
 <HeartHandshake className="w-5 h-5 text-text-primary" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-zinc-900">Date to Marry</h3>
 <p className="text-[10px] text-zinc-400">Matrimonial Platform</p>
 </div>
 </div>
 <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-500" /></button>
 </div>
 </div>
 <div className="p-3 space-y-1">
 {DTM_SECTIONS.map(s => (
 <button key={s.id} onClick={() => { setSection(s.id); setSidebarOpen(false); }}
 className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition', section === s.id ? 'bg-rose-soft text-rose-dark border border-rose-light' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900')}>
 <s.icon className={cn('w-4.5 h-4.5', section === s.id ? 'text-rose-main' : s.color)} />
 {s.label}
 </button>
 ))}
 </div>
 <div className="p-4 mx-3 mb-3 bg-zinc-50 rounded-xl border border-zinc-100">
 <p className="text-[10px] text-zinc-400 font-semibold mb-2">PROFILE COMPLETION</p>
 <div className="w-full bg-zinc-200 rounded-full h-2 mb-1">
 <div className="h-full bg-gradient-to-r from-rose-alt to-rose-alt rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
 </div>
 <p className="text-[10px] text-zinc-500">{profileCompletion}%</p>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>

 {/* Toast */}
 <AnimatePresence>
 {saveMsg && (
 <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
 className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-main text-text-primary text-sm font-medium px-5 py-2.5 rounded-full shadow-xl">
 <CheckCircle className="w-4 h-4 inline mr-2" />{saveMsg}
 </motion.div>
 )}
 </AnimatePresence>

 <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

 {/* ═══ BROWSE SECTION (DEFAULT) ═══════════════ */}
 {section === 'browse' && (
 <div className="space-y-5">
 {/* Sticky top bar — Filters + DTM Shortcuts + Refresh */}
 <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-miamo-bg/90 backdrop-blur-xl border-b border-rose-light/40 flex items-center gap-3">
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={cn(
 'shrink-0 flex items-center gap-2 h-10 px-4 rounded-xl border text-[13px] font-semibold transition-all',
 Object.values(filters).filter(Boolean).length > 0 || showFilters
 ? 'bg-white text-rose-dark border-rose-light shadow-[0_4px_16px_rgba(201,120,86,0.08)]'
 : 'bg-white border-zinc-200 text-zinc-600 hover:border-rose-light hover:text-rose-dark',
 )}
 >
 <Filter className="w-4 h-4" />
 Filters
 {Object.values(filters).filter(Boolean).length > 0 && (
 <span className="ml-0.5 w-5 h-5 rounded-full bg-rose-main text-white text-[10px] font-bold flex items-center justify-center">
 {Object.values(filters).filter(Boolean).length}
 </span>
 )}
 </button>

 <DtmShortcutBar
 filters={filters}
 onChangeFilters={(next) => { setFilters(next); setTimeout(() => applyFilters(), 0); }}
 />

 <button
 onClick={refreshDtmTopTen}
 disabled={dtmRefreshing}
 className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border bg-white border-amber-200 text-amber-700 hover:border-amber-300 disabled:opacity-50"
 title="Refresh top 10 ranked profiles"
 >
 <Sparkles className="w-3.5 h-3.5" /> {dtmRefreshing ? 'Refreshing…' : 'Refresh'}
 </button>
 </div>

 {/* Filter Drawer (fixed, scroll-locked) */}
 <AnimatePresence>
 {showFilters && (
 <div className="fixed inset-0 z-40 flex items-start justify-center pt-[72px] px-3 pb-3 pointer-events-none">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setShowFilters(false)}
 className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
 />
 <motion.div
 initial={{ opacity: 0, y: 18, scale: 0.985 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 18, scale: 0.985 }}
 transition={{ duration: 0.18 }}
 className="relative pointer-events-auto w-[min(96vw,1100px)] max-h-[calc(100vh-96px)]"
 >
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 shadow-2xl flex flex-col h-full overflow-hidden" style={{ maxHeight: 'calc(100vh - 96px)' }}>
 <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-white/80 backdrop-blur-md shrink-0">
 <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
 <Filter className="w-4 h-4 text-rose-main" />
 Refine matches
 {Object.values(filters).filter(Boolean).length > 0 && (
 <span className="ml-1 px-2 h-5 inline-flex items-center rounded-full bg-rose-main text-white text-[10px] font-bold">
 {Object.values(filters).filter(Boolean).length} active
 </span>
 )}
 </div>
 <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="overflow-y-auto p-5 space-y-5 flex-1">
 <FilterSection title="Basics">
 <FilterField label="Religion"><Select value={filters.religion || ''} onChange={v => setFilters(f => ({ ...f, religion: v }))} options={RELIGIONS} placeholder="Any" /></FilterField>
 <FilterField label="Caste"><Select value={filters.caste || ''} onChange={v => setFilters(f => ({ ...f, caste: v }))} options={filters.religion ? (CASTES_BY_RELIGION[filters.religion] || ['Other']) : []} placeholder={filters.religion ? 'Any' : 'Pick religion first'} /></FilterField>
 <FilterField label="Sub-caste"><Input value={filters.subCaste || ''} onChange={(v: string) => setFilters(f => ({ ...f, subCaste: v }))} placeholder="e.g. Saraswat" /></FilterField>
 <FilterField label="Mother Tongue"><Select value={filters.motherTongue || ''} onChange={v => setFilters(f => ({ ...f, motherTongue: v }))} options={MOTHER_TONGUES} placeholder="Any" /></FilterField>
 <FilterField label="Languages"><Input value={filters.languages || ''} onChange={(v: string) => setFilters(f => ({ ...f, languages: v }))} placeholder="e.g. Hindi, English" /></FilterField>
 <FilterField label="Marital Status"><Select value={filters.maritalStatus || ''} onChange={v => setFilters(f => ({ ...f, maritalStatus: v }))} options={MARITAL_STATUSES} placeholder="Any" /></FilterField>
 <FilterField label="Min Age"><Input value={filters.minAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, minAge: v }))} placeholder="e.g. 25" type="number" /></FilterField>
 <FilterField label="Max Age"><Input value={filters.maxAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxAge: v }))} placeholder="e.g. 35" type="number" /></FilterField>
 <FilterField label="City"><Input value={filters.city || ''} onChange={(v: string) => setFilters(f => ({ ...f, city: v }))} placeholder="Any" /></FilterField>
 <FilterField label="State"><Input value={filters.state || ''} onChange={(v: string) => setFilters(f => ({ ...f, state: v }))} placeholder="e.g. Maharashtra" /></FilterField>
 <FilterField label="Country"><Select value={filters.country || ''} onChange={v => setFilters(f => ({ ...f, country: v }))} options={['India','USA','UK','Canada','Australia','UAE','Singapore','Germany','New Zealand','Other']} placeholder="Any" /></FilterField>
 <FilterField label="City Tier"><Select value={filters.cityTier || ''} onChange={v => setFilters(f => ({ ...f, cityTier: v }))} options={['Metro','Tier 1','Tier 2','Tier 3']} placeholder="Any" /></FilterField>
 <FilterField label="NRI status"><Select value={filters.nri || ''} onChange={v => setFilters(f => ({ ...f, nri: v }))} options={['Indian Citizen','NRI','OCI','Foreign National']} placeholder="Any" /></FilterField>
 <FilterField label="Native place"><Input value={filters.nativePlace || ''} onChange={(v: string) => setFilters(f => ({ ...f, nativePlace: v }))} placeholder="e.g. Pune" /></FilterField>
 </FilterSection>

 <FilterSection title="Education & Career">
 <FilterField label="Education"><Select value={filters.education || ''} onChange={v => setFilters(f => ({ ...f, education: v }))} options={EDUCATION_LEVELS} placeholder="Any" /></FilterField>
 <FilterField label="Field of study"><Input value={filters.fieldOfStudy || ''} onChange={(v: string) => setFilters(f => ({ ...f, fieldOfStudy: v }))} placeholder="e.g. Computer Science" /></FilterField>
 <FilterField label="Profession"><Input value={filters.profession || ''} onChange={(v: string) => setFilters(f => ({ ...f, profession: v }))} placeholder="e.g. Doctor" /></FilterField>
 <FilterField label="Occupation Type"><Select value={filters.occupationType || ''} onChange={v => setFilters(f => ({ ...f, occupationType: v }))} options={['Private','Government','Self-employed','Business','Freelance','Defence','Not working']} placeholder="Any" /></FilterField>
 <FilterField label="Industry"><Select value={filters.industry || ''} onChange={v => setFilters(f => ({ ...f, industry: v }))} options={['Tech / IT','Finance','Healthcare','Education','Engineering','Manufacturing','Media','Law','Government','Non-profit','Hospitality','Retail','Other']} placeholder="Any" /></FilterField>
 <FilterField label="Work Mode"><Select value={filters.workMode || ''} onChange={v => setFilters(f => ({ ...f, workMode: v }))} options={['Office','Hybrid','Remote','Travel-heavy']} placeholder="Any" /></FilterField>
 <FilterField label="Min Income"><Select value={filters.minIncome || ''} onChange={v => setFilters(f => ({ ...f, minIncome: v }))} options={INCOMES} placeholder="Any" /></FilterField>
 <FilterField label="Max Income"><Select value={filters.maxIncome || ''} onChange={v => setFilters(f => ({ ...f, maxIncome: v }))} options={INCOMES} placeholder="Any" /></FilterField>
 <FilterField label="Owns home"><ToggleField active={filters.ownsHouse === 'true'} onClick={() => setFilters(f => ({ ...f, ownsHouse: f.ownsHouse === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Owns car"><ToggleField active={filters.ownsCar === 'true'} onClick={() => setFilters(f => ({ ...f, ownsCar: f.ownsCar === 'true' ? '' : 'true' }))} /></FilterField>
 </FilterSection>

 <FilterSection title="Lifestyle">
 <FilterField label="Diet"><Select value={filters.diet || ''} onChange={v => setFilters(f => ({ ...f, diet: v }))} options={DIETS} placeholder="Any" /></FilterField>
 <FilterField label="Smoking"><Select value={filters.smoking || ''} onChange={v => setFilters(f => ({ ...f, smoking: v }))} options={['Never','Occasionally','Regularly','Trying to quit']} placeholder="Any" /></FilterField>
 <FilterField label="Drinking"><Select value={filters.drinking || ''} onChange={v => setFilters(f => ({ ...f, drinking: v }))} options={['Never','Socially','Occasionally','Regularly']} placeholder="Any" /></FilterField>
 <FilterField label="Exercise"><Select value={filters.exercise || ''} onChange={v => setFilters(f => ({ ...f, exercise: v }))} options={['Daily','Often','Sometimes','Rarely','Never']} placeholder="Any" /></FilterField>
 <FilterField label="Pets"><Select value={filters.pets || ''} onChange={v => setFilters(f => ({ ...f, pets: v }))} options={['Dog','Cat','Other pet','No pets','Wants pets','Allergic']} placeholder="Any" /></FilterField>
 <FilterField label="Politics"><Select value={filters.politics || ''} onChange={v => setFilters(f => ({ ...f, politics: v }))} options={['Liberal','Moderate','Conservative','Apolitical','Other']} placeholder="Any" /></FilterField>
 <FilterField label="Religious practice"><Select value={filters.religiousPractice || ''} onChange={v => setFilters(f => ({ ...f, religiousPractice: v }))} options={['Devout','Practicing','Spiritual','Cultural only','Non-practicing']} placeholder="Any" /></FilterField>
 <FilterField label="Hobbies"><Input value={filters.hobbies || ''} onChange={(v: string) => setFilters(f => ({ ...f, hobbies: v }))} placeholder="e.g. travel, music" /></FilterField>
 <FilterField label="Sleep schedule"><Select value={filters.sleepSchedule || ''} onChange={v => setFilters(f => ({ ...f, sleepSchedule: v }))} options={['Early bird','Night owl','Flexible']} placeholder="Any" /></FilterField>
 <FilterField label="Children"><Select value={filters.children || ''} onChange={v => setFilters(f => ({ ...f, children: v }))} options={['No children','Has children, living together','Has children, living apart','Wants children',"Doesn't want children"]} placeholder="Any" /></FilterField>
 </FilterSection>

 <FilterSection title="Appearance">
 <FilterField label="Complexion"><Select value={filters.complexion || ''} onChange={v => setFilters(f => ({ ...f, complexion: v }))} options={COMPLEXIONS} placeholder="Any" /></FilterField>
 <FilterField label="Body Type"><Select value={filters.bodyType || ''} onChange={v => setFilters(f => ({ ...f, bodyType: v }))} options={BODY_TYPES} placeholder="Any" /></FilterField>
 <FilterField label="Min Height"><Select value={filters.minHeight || ''} onChange={v => setFilters(f => ({ ...f, minHeight: v }))} options={HEIGHTS} placeholder="Any" /></FilterField>
 <FilterField label="Max Height"><Select value={filters.maxHeight || ''} onChange={v => setFilters(f => ({ ...f, maxHeight: v }))} options={HEIGHTS} placeholder="Any" /></FilterField>
 <FilterField label="Min Weight (kg)"><Input value={filters.minWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, minWeight: v }))} placeholder="e.g. 50" type="number" /></FilterField>
 <FilterField label="Max Weight (kg)"><Input value={filters.maxWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxWeight: v }))} placeholder="e.g. 80" type="number" /></FilterField>
 <FilterField label="Blood group"><Select value={filters.bloodGroup || ''} onChange={v => setFilters(f => ({ ...f, bloodGroup: v }))} options={['A+','A-','B+','B-','O+','O-','AB+','AB-']} placeholder="Any" /></FilterField>
 <FilterField label="Differently abled"><Select value={filters.differentlyAbled || ''} onChange={v => setFilters(f => ({ ...f, differentlyAbled: v }))} options={['No','Yes — open to it']} placeholder="Any" /></FilterField>
 </FilterSection>

 <FilterSection title="Family">
 <FilterField label="Family Type"><Select value={filters.familyType || ''} onChange={v => setFilters(f => ({ ...f, familyType: v }))} options={FAMILY_TYPES} placeholder="Any" /></FilterField>
 <FilterField label="Family Values"><Select value={filters.familyValues || ''} onChange={v => setFilters(f => ({ ...f, familyValues: v }))} options={FAMILY_VALUES} placeholder="Any" /></FilterField>
 <FilterField label="Family Status"><Select value={filters.familyStatus || ''} onChange={v => setFilters(f => ({ ...f, familyStatus: v }))} options={FAMILY_STATUS} placeholder="Any" /></FilterField>
 <FilterField label="Father's occupation"><Input value={filters.fatherOccupation || ''} onChange={(v: string) => setFilters(f => ({ ...f, fatherOccupation: v }))} placeholder="e.g. Business" /></FilterField>
 <FilterField label="Mother's occupation"><Input value={filters.motherOccupation || ''} onChange={(v: string) => setFilters(f => ({ ...f, motherOccupation: v }))} placeholder="e.g. Homemaker" /></FilterField>
 <FilterField label="Siblings"><Select value={filters.siblings || ''} onChange={v => setFilters(f => ({ ...f, siblings: v }))} options={['Only child','1 sibling','2 siblings','3+ siblings']} placeholder="Any" /></FilterField>
 <FilterField label="Birth order"><Select value={filters.birthOrder || ''} onChange={v => setFilters(f => ({ ...f, birthOrder: v }))} options={['Eldest','Middle','Youngest','Only child']} placeholder="Any" /></FilterField>
 </FilterSection>

 <FilterSection title="Astrology">
 <FilterField label="Manglik"><Select value={filters.manglik || ''} onChange={v => setFilters(f => ({ ...f, manglik: v }))} options={['No','Yes','Anshik',"Don't know"]} placeholder="Any" /></FilterField>
 <FilterField label="Rashi"><Select value={filters.rashi || ''} onChange={v => setFilters(f => ({ ...f, rashi: v }))} options={RAASHIS} placeholder="Any" /></FilterField>
 <FilterField label="Nakshatra"><Select value={filters.nakshatra || ''} onChange={v => setFilters(f => ({ ...f, nakshatra: v }))} options={NAKSHATRAS} placeholder="Any" /></FilterField>
 <FilterField label="Gotra match"><Select value={filters.gotra || ''} onChange={v => setFilters(f => ({ ...f, gotra: v }))} options={['Different gotra','Any gotra']} placeholder="Any" /></FilterField>
 <FilterField label="Gan"><Select value={filters.gan || ''} onChange={v => setFilters(f => ({ ...f, gan: v }))} options={['Deva','Manushya','Rakshasa']} placeholder="Any" /></FilterField>
 <FilterField label="Nadi"><Select value={filters.nadi || ''} onChange={v => setFilters(f => ({ ...f, nadi: v }))} options={['Aadi','Madhya','Antya']} placeholder="Any" /></FilterField>
 <FilterField label="Sect"><Input value={filters.sect || ''} onChange={(v: string) => setFilters(f => ({ ...f, sect: v }))} placeholder="e.g. Vaishnav" /></FilterField>
 <FilterField label="Kuldevta"><Input value={filters.kuldevta || ''} onChange={(v: string) => setFilters(f => ({ ...f, kuldevta: v }))} placeholder="Family deity" /></FilterField>
 </FilterSection>

 <FilterSection title="Open to (inclusivity)">
 <FilterField label="Inter-caste"><ToggleField active={filters.interCasteOk === 'true'} onClick={() => setFilters(f => ({ ...f, interCasteOk: f.interCasteOk === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Inter-faith"><ToggleField active={filters.interFaithOk === 'true'} onClick={() => setFilters(f => ({ ...f, interFaithOk: f.interFaithOk === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Open to widowed"><ToggleField active={filters.openToWidowed === 'true'} onClick={() => setFilters(f => ({ ...f, openToWidowed: f.openToWidowed === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Open to divorcee"><ToggleField active={filters.openToDivorcee === 'true'} onClick={() => setFilters(f => ({ ...f, openToDivorcee: f.openToDivorcee === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Open to single parent"><ToggleField active={filters.openToSingleParent === 'true'} onClick={() => setFilters(f => ({ ...f, openToSingleParent: f.openToSingleParent === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Open to non-Manglik"><ToggleField active={filters.openToNonManglik === 'true'} onClick={() => setFilters(f => ({ ...f, openToNonManglik: f.openToNonManglik === 'true' ? '' : 'true' }))} /></FilterField>
 </FilterSection>

 <FilterSection title="Quick toggles & Sort">
 <FilterField label="Numerology Match"><ToggleField active={filters.numerologyMatch === 'true'} onClick={() => setFilters(f => ({ ...f, numerologyMatch: f.numerologyMatch === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Horoscope Match"><ToggleField active={filters.horoscopeMatch === 'true'} onClick={() => setFilters(f => ({ ...f, horoscopeMatch: f.horoscopeMatch === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Verified only"><ToggleField active={filters.verifiedOnly === 'true'} onClick={() => setFilters(f => ({ ...f, verifiedOnly: f.verifiedOnly === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Photo verified"><ToggleField active={filters.photoVerified === 'true'} onClick={() => setFilters(f => ({ ...f, photoVerified: f.photoVerified === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Has photos"><ToggleField active={filters.hasPhotos === 'true'} onClick={() => setFilters(f => ({ ...f, hasPhotos: f.hasPhotos === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Active recently"><ToggleField active={filters.activeRecently === 'true'} onClick={() => setFilters(f => ({ ...f, activeRecently: f.activeRecently === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Open to relocate"><ToggleField active={filters.willingToRelocate === 'true'} onClick={() => setFilters(f => ({ ...f, willingToRelocate: f.willingToRelocate === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Has bio-data"><ToggleField active={filters.hasBioData === 'true'} onClick={() => setFilters(f => ({ ...f, hasBioData: f.hasBioData === 'true' ? '' : 'true' }))} /></FilterField>
 <FilterField label="Sort by"><Select value={filters.sortBy || ''} onChange={v => setFilters(f => ({ ...f, sortBy: v }))} options={['compatibility','numerology','horoscope','recent','newest','income-desc','age-asc','age-desc','distance-asc']} placeholder="Default" /></FilterField>
 </FilterSection>
 </div>
 <div className="flex gap-2 p-3 border-t border-zinc-100 bg-white/80 backdrop-blur-md shrink-0">
 <button
 onClick={() => { applyFilters(); setShowFilters(false); }}
 className="flex-1 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-dark text-white hover:shadow-lg transition flex items-center justify-center gap-1.5"
 >
 <Search className="w-3.5 h-3.5" /> Apply filters
 </button>
 <button
 onClick={async () => { setFilters({}); setDtmCursor(null); try { const res = await api.browseMatrimonialAdvanced({ limit: 10 }).catch(() => api.browseMatrimonial({ limit: 10 })); setBrowseProfiles(res.data || []); setDtmCursor((res as any).cursor || null); } catch {} }}
 className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition"
 >
 Clear all
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Profile Grid */}
 {profileCompletion < DTM_GATE ? (
 <div className="text-center py-16 bg-gradient-to-br from-rose-soft/60 via-white to-rose-soft/40 rounded-2xl border border-rose-light shadow-soft">
 <Lock className="w-10 h-10 text-rose-main mx-auto mb-3" />
 <h3 className="text-base font-bold text-zinc-900">Reach {DTM_GATE}% to start browsing</h3>
 <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">DTM is a serious flow. Complete your matrimonial profile to unlock browsing, Miamo Moves and Match requests.</p>
 <div className="max-w-xs mx-auto mt-4">
 <div className="w-full bg-zinc-100 rounded-full h-2.5">
 <div className="h-full bg-gradient-to-r from-rose-main to-rose-dark rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
 </div>
 <p className="text-[10px] text-zinc-400 mt-1.5 tabular-nums">{profileCompletion}% complete • {Math.max(0, DTM_GATE - profileCompletion)}% to go</p>
 </div>
 <button onClick={() => setSection('profile')}
 className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-dark text-white shadow-button hover:shadow-lg transition">
 <FileText className="w-3.5 h-3.5" /> Complete my profile
 </button>
 </div>
 ) : browseProfiles.length === 0 ? (
 <div className="text-center py-20 bg-miamo-card rounded-2xl border border-zinc-200">
 <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500 font-medium">No profiles found</p>
 <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters</p>
 </div>
 ) : (
 <div>
 {(() => {
 const idx = Math.min(currentDtmIndex, browseProfiles.length - 1);
 const p = browseProfiles[idx];
 if (!p) return null;
 return (
 <div className="max-w-[640px] mx-auto">
 {/* Index strip */}
 <div className="flex items-center justify-between mb-4">
 <span className="text-[12px] text-zinc-500 font-semibold tabular-nums">
 {idx + 1} <span className="text-zinc-400">of</span> {browseProfiles.length}
 </span>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCurrentDtmIndex((i) => Math.max(0, i - 1))}
 disabled={idx === 0}
 className="h-8 px-3 rounded-lg text-[11px] font-semibold border border-zinc-200 bg-white text-zinc-600 hover:border-rose-light disabled:opacity-40"
 >← Prev</button>
 <button
 onClick={() => {
 if (idx >= browseProfiles.length - 1) refreshDtmTopTen().then(() => setCurrentDtmIndex(0));
 else setCurrentDtmIndex((i) => i + 1);
 }}
 className="h-8 px-3 rounded-lg text-[11px] font-bold bg-rose-main text-white hover:bg-rose-dark"
 >Next →</button>
 </div>
 </div>
 <AnimatePresence mode="wait">
 <MatrimonialBigCard
 key={p.id || idx}
 profile={p}
 onView={() => viewProfile(p.user?.id || p.userId)}
 onSkip={() => {
 if (idx >= browseProfiles.length - 1) refreshDtmTopTen().then(() => setCurrentDtmIndex(0));
 else setCurrentDtmIndex((i) => i + 1);
 }}
 onShortlist={async () => {
 try {
 await api.deferItem({ surface: 'dtm', targetId: p.id, reason: 'thinking' });
 setSaveMsg('Shortlisted');
 setTimeout(() => setSaveMsg(''), 2200);
 if (idx >= browseProfiles.length - 1) refreshDtmTopTen().then(() => setCurrentDtmIndex(0));
 else setCurrentDtmIndex((i) => i + 1);
 } catch (e: any) {
 setSaveMsg(e?.message || 'Could not shortlist');
 setTimeout(() => setSaveMsg(''), 2500);
 }
 }}
 onProposal={async (uid, message) => {
 try {
 await api.requestAccess(uid, 'full', message || 'I would like to connect for marriage.');
 // Refresh chat list + open thread so the new system bubble surfaces.
 const refreshes: Promise<any>[] = [api.getDtmChats().catch(() => ({ data: [] as any[] })), api.getSentAccessRequests().catch(() => ({ data: [] as any[] }))];
 if (activeChatUserId === uid) refreshes.push(api.getDtmChatMessages(uid).catch(() => ({ data: [] as any[] })));
 const [chatsRes, sentRes, msgsRes] = await Promise.all(refreshes);
 setDtmChats((chatsRes as any).data || []);
 setSentRequests((sentRes as any).data || []);
 if (msgsRes) setChatMessages((msgsRes as any).data || []);
 setSaveMsg('Proposal sent');
 setTimeout(() => setSaveMsg(''), 2500);
 } catch (e: any) {
 setSaveMsg(e?.message || 'Failed to send proposal');
 setTimeout(() => setSaveMsg(''), 3000);
 }
 }}
 onRequestAccess={async (uid, type, message) => {
 try {
 await api.requestAccess(uid, type, message || `Requesting ${type} access.`);
 const refreshes: Promise<any>[] = [api.getDtmChats().catch(() => ({ data: [] as any[] })), api.getSentAccessRequests().catch(() => ({ data: [] as any[] }))];
 if (activeChatUserId === uid) refreshes.push(api.getDtmChatMessages(uid).catch(() => ({ data: [] as any[] })));
 const [chatsRes, sentRes, msgsRes] = await Promise.all(refreshes);
 setDtmChats((chatsRes as any).data || []);
 setSentRequests((sentRes as any).data || []);
 if (msgsRes) setChatMessages((msgsRes as any).data || []);
 setSaveMsg('Request sent');
 setTimeout(() => setSaveMsg(''), 2500);
 } catch (e: any) {
 setSaveMsg(e?.message || 'Failed to send request');
 setTimeout(() => setSaveMsg(''), 3000);
 }
 }}
 />
 </AnimatePresence>
 </div>
 );
 })()}
 </div>
 )}
 </div>
 )}

 {/* ═══ MY PROFILE / BIO DATA ═════════════════ */}
 {section === 'profile' && myProfile && (
 <ProfileEditor
 myProfile={myProfile}
 updateField={updateField}
 saveProfile={saveProfile}
 saving={saving}
 profileCompletion={profileCompletion}
 bioDataStep={bioDataStep}
 setBioDataStep={setBioDataStep}
 setShowPreview={setShowPreview}
 setPreviewTemplate={setPreviewTemplate}
 />
 )}

 {/* ═══ MATCHES (3 TABS) ═══════════════════════════════ */}
 {section === 'matches' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Heart className="w-5 h-5 text-rose" /> My Matches</h2>
 {/* Tab bar */}
 <div className="flex gap-1 bg-rose-soft/60 rounded-xl p-1 border border-rose-soft">
 {([['matches', 'My Matches', matches.length], ['incoming', 'Incoming', pendingRequestCount], ['hold', 'On Hold', 0]] as const).map(([key, label, count]) => (
 <button key={key} onClick={() => setMatchTab(key as any)} className={cn('flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all', matchTab === key ? 'bg-rose-soft text-rose-dark shadow-sm border border-rose-light' : 'text-zinc-500 hover:text-zinc-700')}>
 {label} {count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-rose-soft text-rose-dark rounded-full text-[10px]">{count}</span>}
 </button>
 ))}
 </div>

 {/* Tab: Matches */}
 {matchTab === 'matches' && (
 matches.length === 0 ? (
 <div className="text-center py-16 bg-miamo-card rounded-2xl border border-zinc-200">
 <Heart className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500">No matches yet</p>
 <p className="text-xs text-zinc-400 mt-1">Complete your profile for better matching</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {matches.map(p => <MatrimonialCard key={p.id} profile={p} onView={() => viewProfile(p.user?.id || p.userId)} />)}
 </div>
 )
 )}

 {/* Tab: Incoming Requests */}
 {matchTab === 'incoming' && (
 incomingRequests.length === 0 ? (
 <div className="text-center py-16 bg-miamo-card rounded-2xl border border-zinc-200">
 <Shield className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500">No incoming requests</p>
 </div>
 ) : (
 <div className="space-y-3">
 {incomingRequests.map(req => {
 const user = req.requester?.user;
 return (
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-soft">
 <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center shrink-0">
 <span className="text-base font-bold text-text-primary">{user?.displayName?.[0] || '?'}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-zinc-900">{user?.displayName || 'User'}</p>
 <p className="text-xs text-zinc-500">Wants: <span className="text-rose-main font-medium">{req.accessType}</span></p>
 {req.message && <p className="text-xs text-zinc-400 mt-0.5 truncate">&ldquo;{req.message}&rdquo;</p>}
 </div>
 <div className="flex gap-1.5 shrink-0">
 {req.status === 'pending' ? (
 <>
 <button onClick={() => handleAccessAction(req.id, 'grant')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-soft text-rose-dark hover:bg-rose-soft border border-rose-light transition-colors">✓ Grant</button>
 <button onClick={() => handleAccessAction(req.id, 'deny')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">✕ Deny</button>
 </>
 ) : req.status === 'granted' ? (
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-soft text-rose-dark">Granted</span>
 <button onClick={() => handleAccessAction(req.id, 'revoke')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 transition-colors">Revoke</button>
 </div>
 ) : (
 <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700">Denied</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )
 )}

 {/* Tab: On Hold */}
 {matchTab === 'hold' && (
 <div className="text-center py-16 bg-miamo-card rounded-2xl border border-zinc-200">
 <Send className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500">Profiles you put on hold will appear here</p>
 </div>
 )}
 </div>
 )}

 {/* ═══ NUMEROLOGY ════════════════════════════ */}
 {section === 'numerology' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Hash className="w-5 h-5 text-rose-main" /> Numerology</h2>
 {!numerologyData ? (
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-8 text-center shadow-soft">
 <div className="text-5xl mb-4">🔢</div>
 <h3 className="text-base font-bold text-zinc-900 mb-2">Discover Your Numbers</h3>
 <p className="text-sm text-zinc-500 mb-5">Calculate your Life Path, Destiny & Soul numbers using Pythagorean + Vedic analysis.</p>
 <button onClick={loadNumerology} className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-main to-rose-main text-text-primary text-sm font-bold hover:shadow-lg transition">
 Calculate My Numerology
 </button>
 </div>
 ) : (
 <div className="space-y-5">
 {/* 4-Card Grid: Life Path, Destiny, Soul, Personal Year */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="bg-rose-soft rounded-2xl p-5 text-center border border-rose-soft">
 <p className="text-4xl font-black text-rose-main">{numerologyData.lifePath}</p>
 <p className="text-xs text-rose-main font-semibold mt-2">Life Path</p>
 </div>
 <div className="bg-rose-soft rounded-2xl p-5 text-center border border-rose-soft">
 <p className="text-4xl font-black text-rose-main">{numerologyData.destiny}</p>
 <p className="text-xs text-rose-main font-semibold mt-2">Destiny</p>
 </div>
 <div className="bg-rose-soft rounded-2xl p-5 text-center border border-rose-soft">
 <p className="text-4xl font-black text-rose-main">{numerologyData.soul}</p>
 <p className="text-xs text-rose-main font-semibold mt-2">Soul</p>
 </div>
 <div className="bg-rose-soft rounded-2xl p-5 text-center border border-rose-soft">
 <p className="text-4xl font-black text-rose-main">{numerologyData.personalYear || '—'}</p>
 <p className="text-xs text-rose-main font-semibold mt-2">Personal Year</p>
 </div>
 </div>

 {/* Info Rows */}
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 shadow-soft">
 <h3 className="text-xs font-bold text-zinc-900 mb-3 flex items-center gap-2">🕉 Vedic Numerology Details</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Ruling Planet</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.rulingPlanet}</span></div>
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Lucky Gem</span><span className="text-sm text-zinc-800 font-medium">💎 {numerologyData.luckyGem || '—'}</span></div>
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Mantra</span><span className="text-sm text-zinc-800 font-medium italic">{numerologyData.mantra || '—'}</span></div>
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Hora Lord</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.horaLord || '—'}</span></div>
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Elemental Energy</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.elementalEnergy || '—'}</span></div>
 <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"><span className="text-xs font-semibold text-zinc-500 w-28">Lucky Day</span><span className="text-sm text-zinc-800 font-medium">{numerologyData.luckyDay || '—'}</span></div>
 </div>
 </div>

 {/* Karmic Debt Warning */}
 {numerologyData.hasKarmicDebt && (
 <div className="bg-rose-soft border border-rose-light rounded-2xl p-4 flex items-start gap-3">
 <span className="text-rose-main text-lg mt-0.5">⚠️</span>
 <div>
 <p className="text-sm font-bold text-rose-dark">Karmic Debt Detected</p>
 <p className="text-xs text-rose-main mt-1">{numerologyData.karmicLesson || 'Past-life lessons require attention in this lifetime.'}</p>
 </div>
 </div>
 )}

 {/* Compatible Numbers */}
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-soft">
 <div>
 <p className="text-xs text-zinc-500 font-semibold mb-2">Compatible Numbers</p>
 <div className="flex gap-2">
 {numerologyData.compatibleNumbers?.map((n: number) => (
 <span key={n} className="w-8 h-8 rounded-full bg-rose-soft text-rose-dark font-bold text-sm flex items-center justify-center border border-rose-light">{n}</span>
 ))}
 </div>
 </div>

 {/* Lucky Colors as dots */}
 <div>
 <p className="text-xs text-zinc-500 font-semibold mb-2">Lucky Colors</p>
 <div className="flex gap-2">
 {numerologyData.luckyColors?.map((color: string, i: number) => (
 <div key={i} className="flex items-center gap-1.5">
 <span className="w-4 h-4 rounded-full border border-zinc-200 shadow-sm" style={{ backgroundColor: color.toLowerCase().includes('gold') ? '#FFD700' : color.toLowerCase().includes('red') ? '#DC2626' : color.toLowerCase().includes('orange') ? '#EA580C' : color.toLowerCase().includes('yellow') ? '#EAB308' : color.toLowerCase().includes('green') ? '#16A34A' : color.toLowerCase().includes('blue') ? '#2563EB' : color.toLowerCase().includes('purple') ? '#9333EA' : color.toLowerCase().includes('white') ? '#F8FAFC' : color.toLowerCase().includes('pink') ? '#EC4899' : '#6B7280' }} />
 <span className="text-xs text-zinc-600">{color}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Traits as badges */}
 <div>
 <p className="text-xs text-zinc-500 font-semibold mb-2">Traits</p>
 <div className="flex flex-wrap gap-2">
 {numerologyData.traits?.map((t: string, i: number) => (
 <span key={i} className="px-3 py-1.5 text-xs font-medium bg-rose-soft text-rose-dark rounded-full border border-rose-soft">{t}</span>
 ))}
 </div>
 </div>
 </div>

 <button onClick={() => { setFilters({ numerologyMatch: 'true', sortBy: 'numerology' }); setSection('browse'); applyFilters(); }}
 className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-main to-rose-main text-text-primary text-sm font-bold hover:shadow-lg transition">
 Browse Numerology-Compatible Profiles →
 </button>
 </div>
 )}
 </div>
 )}

 {/* ═══ KUNDLI / HOROSCOPE ══════════════════ */}
 {section === 'kundli' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Moon className="w-5 h-5 text-rose-main" /> Kundli / Horoscope</h2>
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-soft">
 <h3 className="text-sm font-bold text-zinc-900">Upload Your Kundli</h3>
 <p className="text-xs text-zinc-500">Upload your kundli/horoscope data. When both partners have kundli data, AI will analyze match compatibility using Ashtakoota system.</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Field label="Kundli URL / Image Link"><Input value={myProfile?.kundliUrl} onChange={(v: string) => updateField('kundliUrl', v)} placeholder="https://...kundli.pdf" /></Field>
 <Field label="Nakshatra"><Select value={myProfile?.star || myProfile?.nakshatra} onChange={(v: string) => updateField('star', v)} options={NAKSHATRAS} placeholder="Select" /></Field>
 <Field label="Raasi"><Select value={myProfile?.raasi} onChange={(v: string) => updateField('raasi', v)} options={RAASHIS} placeholder="Select" /></Field>
 <Field label="Gotra"><Input value={myProfile?.gotra} onChange={(v: string) => updateField('gotra', v)} placeholder="Gotra" /></Field>
 </div>
 <button onClick={async () => { await saveProfile(); setSaveMsg('Kundli data saved!'); setTimeout(() => setSaveMsg(''), 3000); }}
 className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-main text-text-primary hover:shadow-lg transition">
 Save Kundli Data
 </button>
 </div>
 <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5">
 <h3 className="text-sm font-bold text-zinc-700 mb-2">About Ashtakoota Matching</h3>
 <p className="text-xs text-zinc-500 leading-relaxed">The traditional Ashtakoota system evaluates 8 aspects: <strong>Varna</strong> (spiritual), <strong>Vashya</strong> (attraction), <strong>Tara</strong> (health), <strong>Yoni</strong> (physical), <strong>Graha Maitri</strong> (mental), <strong>Gana</strong> (temperament), <strong>Bhakoot</strong> (love), and <strong>Nadi</strong> (progeny). Total 36 points. 18+ is considered acceptable.</p>
 </div>
 </div>
 )}

 {/* ═══ DTM CHAT ═══════════════════════════════ */}
 {section === 'chat' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-rose-main" /> DTM Chat</h2>
 {!activeChatUserId ? (
 <div className="space-y-3">
 {dtmChats.length === 0 ? (
 <div className="text-center py-16 bg-miamo-card rounded-2xl border border-zinc-200">
 <MessageCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500">No DTM chats yet</p>
 <p className="text-xs text-zinc-400 mt-1">Browse profiles and start a conversation</p>
 </div>
 ) : dtmChats.map(c => (
 <button key={c.userId} onClick={() => openChat(c.userId)}
 className="w-full bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 hover:bg-zinc-50 transition text-left">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center shrink-0">
 <span className="text-base font-bold text-text-primary">?</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-zinc-900">{c.userId.slice(0, 8)}...</p>
 <p className="text-xs text-zinc-500 truncate">{c.lastMessage?.message || 'No messages'}</p>
 </div>
 {c.unreadCount > 0 && <span className="w-6 h-6 rounded-full bg-rose-main text-text-primary text-xs font-bold flex items-center justify-center">{c.unreadCount}</span>}
 </button>
 ))}
 </div>
 ) : (
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 overflow-hidden shadow-soft">
 <div className="flex items-center gap-3 p-4 border-b border-zinc-100">
 <button onClick={() => setActiveChatUserId(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><ChevronLeft className="w-4 h-4 text-zinc-600" /></button>
 <p className="text-sm font-semibold text-zinc-900">Chat</p>
 </div>
 <div className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-50">
 {chatMessages.length === 0 && <p className="text-center text-xs text-zinc-400 py-10">No messages yet. Say hello!</p>}
 {chatMessages.map(m => {
 // System events (access requests / decisions) render as centered cards
 if (m.type === 'access_request' || m.type === 'access_decision') {
 return <AccessSystemBubble key={m.id} msg={m} myUserId={myProfile?.userId} allMessages={chatMessages} onAct={async (reqId, action) => {
 try {
 await api.handleAccessRequest(reqId, action);
 // refetch chat + incoming so the inline state and access tab both update
 const [chatRes, incRes] = await Promise.all([
 api.getDtmChatMessages(activeChatUserId!).catch(() => ({ data: [] as any[] })),
 api.getIncomingAccessRequests().catch(() => ({ data: [] as any[] })),
 ]);
 setChatMessages((chatRes as any).data || []);
 setIncomingRequests((incRes as any).data || []);
 setSaveMsg(action === 'grant' ? 'Access granted' : action === 'deny' ? 'Request denied' : 'Access revoked');
 setTimeout(() => setSaveMsg(''), 2200);
 } catch (e: any) {
 setSaveMsg(e?.message || 'Action failed');
 setTimeout(() => setSaveMsg(''), 2500);
 }
 }} />;
 }
 // Regular text/image/video bubble
 const mine = m.senderId === myProfile?.userId;
 return (
 <div key={m.id} className={cn('max-w-[75%] rounded-2xl p-3', mine ? 'ml-auto bg-rose-main text-text-primary' : 'bg-miamo-card border border-zinc-200 text-zinc-800')}>
 {m.type === 'image' ? <img src={m.message} alt="" className="rounded-lg max-w-full" />
 : m.type === 'video' ? <video src={m.message} controls className="rounded-lg max-w-full" />
 : <p className="text-sm">{m.message}</p>}
 <p className={cn('text-[10px] mt-1', mine ? 'text-rose-soft' : 'text-zinc-400')}>{new Date(m.createdAt || m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
 </div>
 );
 })}
 </div>
 <div className="p-3 border-t border-zinc-100 space-y-2">
 {dtmAttachedFile && (
 <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2">
 {dtmAttachedFile.preview && dtmAttachedFile.file.type.startsWith('image/') && (
 <img src={dtmAttachedFile.preview} alt="Attached" className="w-10 h-10 rounded-lg object-cover" />
 )}
 {dtmAttachedFile.preview && dtmAttachedFile.file.type.startsWith('video/') && (
 <video src={dtmAttachedFile.preview} className="w-10 h-10 rounded-lg object-cover" muted />
 )}
 <span className="text-xs text-zinc-600 truncate flex-1">{dtmAttachedFile.file.name}</span>
 <button onClick={() => { if (dtmAttachedFile.preview) URL.revokeObjectURL(dtmAttachedFile.preview); setDtmAttachedFile(null); }}
 className="w-5 h-5 rounded-full bg-zinc-300 flex items-center justify-center"><X className="w-3 h-3" /></button>
 </div>
 )}
 <div className="flex gap-2">
 <button onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,video/*'; inp.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) { const preview = URL.createObjectURL(f); setDtmAttachedFile({ file: f, preview, type: f.type.startsWith('image/') ? 'photo' : 'video' }); } }; inp.click(); }}
 className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition" title="Attach photo/video">
 <Camera className="w-4 h-4 text-zinc-500" />
 </button>
 <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
 className="flex-1 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-main/40" placeholder="Type a message..." />
 <button onClick={sendChatMessage} disabled={dtmSending}
 className={cn("w-10 h-10 rounded-xl bg-gradient-to-r from-rose-main to-rose-main flex items-center justify-center hover:shadow-lg transition", dtmSending && "opacity-50")}>
 <Send className="w-4 h-4 text-text-primary" />
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ═══ ACCESS CONTROL (3-way: Grant / Deny / Revoke) ══════════════════════════ */}
 {section === 'access' && (
 <div className="space-y-6">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Shield className="w-5 h-5 text-rose-main" /> Access Control</h2>
 <p className="text-xs text-zinc-500 -mt-3">Manage who can see your biodata, photos, and contact details</p>

 {/* Incoming Requests */}
 <div className="space-y-3">
 <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">📥 Incoming Requests <span className="text-[10px] px-2 py-0.5 bg-rose-soft text-rose-dark rounded-full">{incomingRequests.filter(r => r.status === 'pending').length} pending</span></h3>
 {incomingRequests.length === 0 ? (
 <div className="text-center py-10 bg-miamo-card rounded-2xl border border-zinc-200"><Shield className="w-10 h-10 text-zinc-300 mx-auto mb-3" /><p className="text-sm text-zinc-500">No incoming requests</p></div>
 ) : incomingRequests.map(req => {
 const user = req.requester?.user;
 return (
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-soft hover:shadow-md transition-shadow">
 <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center shrink-0">
 <span className="text-base font-bold text-text-primary">{user?.displayName?.[0] || '?'}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-zinc-900">{user?.displayName || 'User'}</p>
 <p className="text-xs text-zinc-500">Wants: <span className="text-rose-main font-medium">{req.accessType}</span></p>
 {req.message && <p className="text-xs text-zinc-400 mt-0.5 truncate italic">&ldquo;{req.message}&rdquo;</p>}
 </div>
 <div className="flex gap-1.5 shrink-0">
 {req.status === 'pending' ? (
 <>
 <button onClick={() => handleAccessAction(req.id, 'grant')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-soft text-rose-dark hover:bg-rose-soft border border-rose-light transition-colors">✓ Grant</button>
 <button onClick={() => handleAccessAction(req.id, 'deny')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">✕ Deny</button>
 </>
 ) : req.status === 'granted' ? (
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-rose-soft text-rose-dark border border-rose-light">✓ Granted</span>
 <button onClick={() => handleAccessAction(req.id, 'revoke')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-soft text-rose-dark hover:bg-rose-soft border border-rose-light transition-colors">⟲ Revoke</button>
 </div>
 ) : (
 <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">✕ Denied</span>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {/* Sent Requests */}
 <div className="space-y-3">
 <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">📤 Sent Requests <span className="text-[10px] px-2 py-0.5 bg-rose-soft text-rose-dark rounded-full">{sentRequests.filter(r => r.status === 'pending').length} awaiting</span></h3>
 {sentRequests.length === 0 ? (
 <div className="text-center py-10 bg-miamo-card rounded-2xl border border-zinc-200"><Send className="w-10 h-10 text-zinc-300 mx-auto mb-3" /><p className="text-sm text-zinc-500">No sent requests</p></div>
 ) : sentRequests.map(req => (
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-soft">
 <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center shrink-0"><span className="text-base font-bold text-text-primary">{req.owner?.user?.displayName?.[0] || '?'}</span></div>
 <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-zinc-900">{req.owner?.user?.displayName || 'User'}</p><p className="text-xs text-zinc-500">Requested: <span className="text-rose-main font-medium">{req.accessType}</span></p></div>
 <span className={cn('text-xs font-medium px-3 py-1.5 rounded-lg border', req.status === 'pending' ? 'bg-rose-soft text-rose-dark border-rose-light' : req.status === 'granted' ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-red-50 text-red-700 border-red-200')}>
 {req.status === 'pending' ? '⏳ Awaiting' : req.status === 'granted' ? '✓ Granted' : '✕ Denied'}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ═══ PARTNER PREFERENCES ════════════════════ */}
 {section === 'preferences' && myProfile && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Heart className="w-5 h-5 text-rose" /> Partner Preferences</h2>
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-soft">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Field label="Min Age"><Input type="number" value={myProfile.partnerAgeMin} onChange={(v: string) => updateField('partnerAgeMin', parseInt(v) || 21)} /></Field>
 <Field label="Max Age"><Input type="number" value={myProfile.partnerAgeMax} onChange={(v: string) => updateField('partnerAgeMax', parseInt(v) || 35)} /></Field>
 <Field label="Min Height"><Select value={myProfile.partnerHeightMin} onChange={(v: string) => updateField('partnerHeightMin', v)} options={HEIGHTS} placeholder="Any" /></Field>
 <Field label="Max Height"><Select value={myProfile.partnerHeightMax} onChange={(v: string) => updateField('partnerHeightMax', v)} options={HEIGHTS} placeholder="Any" /></Field>
 <Field label="Religion"><Select value={myProfile.partnerReligion} onChange={(v: string) => updateField('partnerReligion', v)} options={RELIGIONS} placeholder="Any" /></Field>
 <Field label="Caste"><Select value={myProfile.partnerCaste} onChange={(v: string) => updateField('partnerCaste', v)} options={myProfile.partnerReligion ? (CASTES_BY_RELIGION[myProfile.partnerReligion] || ['Other']) : []} placeholder="Any" /></Field>
 <Field label="Education"><Select value={myProfile.partnerEducation} onChange={(v: string) => updateField('partnerEducation', v)} options={EDUCATION_LEVELS} placeholder="Any" /></Field>
 <Field label="Occupation"><Input value={myProfile.partnerOccupation} onChange={(v: string) => updateField('partnerOccupation', v)} placeholder="Any" /></Field>
 <Field label="Min Income"><Select value={myProfile.partnerIncome} onChange={(v: string) => updateField('partnerIncome', v)} options={INCOMES} placeholder="Any" /></Field>
 <Field label="City"><Input value={myProfile.partnerCity} onChange={(v: string) => updateField('partnerCity', v)} placeholder="Any" /></Field>
 <Field label="Manglik"><Select value={myProfile.partnerManglik} onChange={(v: string) => updateField('partnerManglik', v)} options={MANGLIK_OPTIONS} placeholder="Any" /></Field>
 <Field label="Mother Tongue"><Select value={myProfile.partnerMotherTongue} onChange={(v: string) => updateField('partnerMotherTongue', v)} options={MOTHER_TONGUES} placeholder="Any" /></Field>
 </div>
 <Field label="What you expect in a life partner"><Textarea value={myProfile.partnerExpectation} onChange={(v: string) => updateField('partnerExpectation', v)} placeholder="Describe ideal partner..." rows={4} /></Field>
 </div>
 <button onClick={saveProfile} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-main to-rose-main text-text-primary hover:shadow-lg transition disabled:opacity-50">
 {saving ? 'Saving...' : 'Save Preferences'}
 </button>
 </div>
 )}

 {/* ═══ PRIVACY & SECURITY ═════════════════════ */}
 {section === 'privacy' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Lock className="w-5 h-5 text-zinc-600" /> Privacy & Security</h2>
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-soft">
 <h3 className="text-sm font-bold text-zinc-900">Who can see your info</h3>
 {[
 { key: 'bioDataPublic', label: 'Bio Data', desc: 'Allow everyone to view your bio data' },
 { key: 'phonePublic', label: 'Phone Number', desc: 'Allow everyone to see your phone (not recommended)' },
 { key: 'linkedInPublic', label: 'LinkedIn', desc: 'Allow everyone to see your LinkedIn' },
 { key: 'emailPublic', label: 'Email Address', desc: 'Allow everyone to see your email' },
 { key: 'photosPublic', label: 'All Photos', desc: 'Show all photos to everyone' },
 ].map(item => (
 <div key={item.key} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
 <div><p className="text-sm text-zinc-800 font-medium">{item.label}</p><p className="text-[10px] text-zinc-400">{item.desc}</p></div>
 <button onClick={() => updateField(item.key, !myProfile?.[item.key])}
 className={cn('w-12 h-7 rounded-full transition-colors relative', myProfile?.[item.key] ? 'bg-rose-main' : 'bg-zinc-200')}>
 <div className={cn('w-5 h-5 rounded-full bg-miamo-card shadow-sm absolute top-1 transition-all', myProfile?.[item.key] ? 'right-1' : 'left-1')} />
 </button>
 </div>
 ))}
 </div>
 <button onClick={saveProfile} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-main to-rose-main text-text-primary hover:shadow-lg transition disabled:opacity-50">
 {saving ? 'Saving...' : 'Save Privacy Settings'}
 </button>
 </div>
 )}

 {/* ═══ TEMPLATES ══════════════════════════════ */}
 {section === 'templates' && (
 <div className="space-y-5">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Palette className="w-5 h-5 text-rose-main" /> Bio Data Templates</h2>
 <p className="text-sm text-zinc-500">Choose a template theme. Preview will use the selected template with your profile data.</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
 {TEMPLATES.map(t => (
 <button key={t.id} onClick={() => { updateField('bioDataTemplate', t.id); setPreviewTemplate(t.id); }}
 className={cn('relative rounded-2xl p-4 text-left transition border overflow-hidden',
 (myProfile?.bioDataTemplate || previewTemplate) === t.id ? 'border-rose-alt bg-rose-soft ring-2 ring-rose-light' : 'border-zinc-200 hover:border-zinc-300 bg-miamo-card')}>
 {t.premium && <div className="absolute top-2 right-2"><Crown className="w-3.5 h-3.5 text-rose-main" /></div>}
 <div className="flex items-center gap-2 mb-2">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `linear-gradient(135deg, ${t.colors[0]}40, ${t.colors[1]}40)` }}>{t.emoji}</div>
 {(myProfile?.bioDataTemplate || previewTemplate) === t.id && <Check className="w-4 h-4 text-rose-main" />}
 </div>
 <p className="text-xs font-semibold text-zinc-800 truncate">{t.name}</p>
 <div className="flex gap-1 mt-2">{t.colors.map((c, i) => <div key={i} className="w-4 h-4 rounded-full border border-zinc-200" style={{ background: c }} />)}</div>
 </button>
 ))}
 </div>
 <div className="flex gap-3">
 <button onClick={saveProfile} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-main text-text-primary hover:shadow-lg transition">Save Template</button>
 {myProfile?.fullName && (
 <button onClick={() => { setPreviewTemplate(myProfile.bioDataTemplate || previewTemplate || 'royal-rajasthani'); setShowPreview(true); }}
 className="px-5 py-2.5 rounded-xl text-xs font-semibold text-rose-dark bg-rose-soft border border-rose-light hover:bg-rose-soft transition flex items-center gap-1.5">
 <Eye className="w-3.5 h-3.5" /> Preview with this Template
 </button>
 )}
 </div>
 </div>
 )}
 </div>

 {/* ═══ BIO DATA PREVIEW MODAL ═══════════════════ */}
 <AnimatePresence>
 {showPreview && myProfile && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
 <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
 className="bg-miamo-card rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 shadow-2xl p-6"
 onClick={(e: any) => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><ScrollText className="w-5 h-5 text-rose-main" /> Bio Data Preview</h2>
 <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><X className="w-4 h-4 text-zinc-600" /></button>
 </div>
 <BioDataPreview profile={myProfile} templateId={previewTemplate || myProfile.bioDataTemplate || 'royal-rajasthani'} />
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* ═══ PROFILE DETAIL MODAL ═════════════════════ */}
 <AnimatePresence>
 {selectedProfile && (
 <ProfileDetailModal
 profile={selectedProfile}
 onClose={() => setSelectedProfile(null)}
 onRequestAccess={requestAccess}
 onCheckCompat={() => checkCompatibility(selectedProfile.user?.id || selectedProfile.userId)}
 />
 )}
 </AnimatePresence>

 {/* ═══ COMPATIBILITY MODAL ═════════════════════ */}
 <AnimatePresence>
 {compatData && <CompatibilityModal data={compatData} onClose={() => setCompatData(null)} />}
 </AnimatePresence>
 </div>
 </ErrorBoundary>
 );
}

// ═══ Access-event chat bubble (system messages) ═══
const ACCESS_LABEL: Record<string, string> = {
 full: 'Full Bio-Data (Proposal)',
 bioData: 'Bio-Data',
 photos: 'Photos',
 horoscope: 'Horoscope',
 phone: 'Phone',
 email: 'Email',
 linkedin: 'LinkedIn',
};
const ACCESS_ICON: Record<string, any> = {
 full: Send, bioData: FileText, photos: Camera, horoscope: Moon, phone: Phone, email: Mail, linkedin: Linkedin,
};

function AccessSystemBubble({
 msg, myUserId, allMessages, onAct,
}: {
 msg: any;
 myUserId: string | undefined;
 allMessages: any[];
 onAct: (requestId: string, action: 'grant' | 'deny' | 'revoke') => Promise<void> | void;
}) {
 let payload: { requestId?: string; accessType?: string; note?: string; action?: string; status?: string; kind?: string } = {};
 try { payload = JSON.parse(msg.message || '{}'); } catch {}
 const accessType = payload.accessType || 'bioData';
 const Icon = ACCESS_ICON[accessType] || Lock;
 const label = ACCESS_LABEL[accessType] || accessType;
 const iAmRecipient = msg.recipientId === myUserId;
 const [pending, setPending] = useState<null | 'grant' | 'deny'>(null);

 // Check if this request was already resolved by scanning later access_decision messages
 const resolution = (() => {
 if (!payload.requestId) return null;
 const decision = allMessages.find(
 (mm) => mm.type === 'access_decision' && (() => { try { return JSON.parse(mm.message || '{}').requestId === payload.requestId; } catch { return false; } })()
 );
 if (!decision) return null;
 try { return JSON.parse(decision.message || '{}').status as 'granted' | 'denied' | 'revoked'; } catch { return null; }
 })();

 if (msg.type === 'access_decision') {
 const status = (payload.status || payload.action || 'updated') as string;
 const positive = status === 'granted';
 const StatusIcon = positive ? ShieldCheck : ShieldX;
 return (
 <div className="flex justify-center">
 <div className={cn(
 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border',
 positive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-600',
 )}>
 <StatusIcon className="w-3.5 h-3.5" />
 {positive ? 'Granted' : status === 'denied' ? 'Denied' : status === 'revoked' ? 'Revoked' : status} · {label}
 </div>
 </div>
 );
 }

 // access_request bubble
 const isProposal = payload.kind === 'proposal' || accessType === 'full';
 return (
 <div className="flex justify-center">
 <div className="w-full max-w-[340px] rounded-2xl bg-white border border-rose-light/60 shadow-sm overflow-hidden">
 <div className={cn(
 'px-4 py-2.5 flex items-center gap-2 border-b',
 isProposal ? 'bg-gradient-to-r from-rose-soft to-white border-rose-light/60' : 'bg-rose-soft/40 border-rose-light/40',
 )}>
 <Icon className="w-3.5 h-3.5 text-rose-main" />
 <span className="text-[11px] font-bold text-rose-dark uppercase tracking-wide">
 {isProposal ? 'Proposal' : 'Access Request'}
 </span>
 <span className="text-[10px] text-zinc-400 ml-auto">{new Date(msg.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 <div className="px-4 py-3 space-y-2">
 <p className="text-[12.5px] text-zinc-800 leading-relaxed">
 <span className="font-bold">{iAmRecipient ? 'They' : 'You'}</span> requested access to <span className="font-bold text-rose-dark">{label}</span>.
 </p>
 {payload.note && payload.note.trim() && (
 <p className="text-[12px] text-zinc-600 leading-relaxed bg-zinc-50 border-l-2 border-rose-light pl-2.5 py-1.5 italic">"{payload.note}"</p>
 )}
 {iAmRecipient && payload.requestId && !resolution && (
 <div className="flex gap-2 pt-1">
 <button
 disabled={!!pending}
 onClick={async () => { setPending('deny'); try { await onAct(payload.requestId!, 'deny'); } finally { setPending(null); } }}
 className="flex-1 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-[11px] font-bold hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-1"
 >
 <ShieldX className="w-3 h-3" /> {pending === 'deny' ? '…' : 'Deny'}
 </button>
 <button
 disabled={!!pending}
 onClick={async () => { setPending('grant'); try { await onAct(payload.requestId!, 'grant'); } finally { setPending(null); } }}
 className="flex-1 h-8 rounded-lg bg-gradient-to-r from-rose-main to-rose-dark text-white text-[11px] font-bold shadow-button hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1"
 >
 <ShieldCheck className="w-3 h-3" /> {pending === 'grant' ? '…' : 'Grant'}
 </button>
 </div>
 )}
 {resolution && (
 <p className={cn(
 'text-[11px] font-semibold flex items-center gap-1 pt-1',
 resolution === 'granted' ? 'text-emerald-600' : 'text-zinc-500',
 )}>
 {resolution === 'granted' ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
 {resolution === 'granted' ? 'You granted access' : resolution === 'denied' ? 'You denied this request' : 'Access revoked'}
 </p>
 )}
 {!iAmRecipient && !resolution && (
 <p className="text-[11px] text-zinc-400 italic flex items-center gap-1 pt-1">
 <Clock className="w-3 h-3" /> Awaiting their response…
 </p>
 )}
 </div>
 </div>
 </div>
 );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
 return (
  <div className="space-y-2">
   <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">{title}</div>
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
  </div>
 );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
 return (
  <div className="space-y-1">
   <div className="text-[10px] font-semibold text-zinc-500 px-1">{label}</div>
   {children}
  </div>
 );
}

function ToggleField({ active, onClick }: { active: boolean; onClick: () => void }) {
 return (
  <button onClick={onClick} className={cn('w-full h-9 px-3 rounded-lg border text-[12px] font-semibold flex items-center justify-between transition', active ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300')}>
   <span>{active ? 'On' : 'Off'}</span>
   <span className={cn('text-[9px] font-extrabold rounded-full px-1.5 h-4 inline-flex items-center border', active ? 'bg-rose-main text-white border-rose-main' : 'bg-white text-zinc-400 border-zinc-200')}>{active ? 'ON' : 'OFF'}</span>
  </button>
 );
}
