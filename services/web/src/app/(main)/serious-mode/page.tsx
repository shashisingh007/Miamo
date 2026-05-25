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
} from 'lucide-react';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Select, Input, Field, Textarea } from './components/FormWidgets';

import {
 RELIGIONS, CASTES_BY_RELIGION, MOTHER_TONGUES, HEIGHTS, EDUCATION_LEVELS,
 INCOMES, FAMILY_TYPES, FAMILY_STATUS, FAMILY_VALUES, MARITAL_STATUSES,
 DIETS, MANGLIK_OPTIONS, COMPLEXIONS, BODY_TYPES, NAKSHATRAS, RAASHIS,
 TEMPLATES,
} from './components/constants';
import { BioDataPreview } from './components/BioDataPreview';
import { MatrimonialCard } from './components/MatrimonialCard';
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
 const [section, setSection] = useState<SectionId>('browse');
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
 const [showPreview, setShowPreview] = useState(false);
 const [previewTemplate, setPreviewTemplate] = useState('');

 // Filters
 const [filters, setFilters] = useState<Record<string, string>>({});
 const [showFilters, setShowFilters] = useState(false);
 const [bioDataStep, setBioDataStep] = useState(0);
 const [matchTab, setMatchTab] = useState<'matches' | 'incoming' | 'hold'>('matches');

 // Profile completion check
 const profileCompletion = useMemo(() => myProfile ? Math.min(100, [myProfile.fullName, myProfile.religion, myProfile.caste, myProfile.education, myProfile.occupation, myProfile.fatherName, myProfile.dateOfBirth, myProfile.height, myProfile.motherTongue, myProfile.maritalStatus].filter(Boolean).length * 10) : 0, [myProfile]);

 const pendingRequestCount = useMemo(() => incomingRequests.filter(r => r.status === 'pending').length, [incomingRequests]);

 // Load data
 useEffect(() => {
 Promise.all([
 api.getMatrimonialProfile().catch(() => ({ data: null })),
 api.browseMatrimonialAdvanced().catch(() => api.browseMatrimonial().catch(() => ({ data: [] }))),
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
 const res = await api.browseMatrimonialAdvanced(filters).catch(() => api.browseMatrimonial(filters));
 setBrowseProfiles(res.data || []);
 } catch {}
 }, [filters]);

 const viewProfile = useCallback(async (userId: string) => {
 try { const res = await api.getMatrimonialUserProfile(userId); setSelectedProfile(res.data); } catch {}
 }, []);

 const checkCompatibility = useCallback(async (userId: string) => {
 try { const res = await api.getMatrimonialCompatibility(userId); setCompatData(res.data); } catch { setSaveMsg('Need DOB for compatibility'); setTimeout(() => setSaveMsg(''), 3000); }
 }, []);

 const handleAccessAction = useCallback(async (id: string, action: 'grant' | 'deny' | 'revoke') => {
 try { await api.handleAccessRequest(id, action); setIncomingRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'grant' ? 'granted' : action === 'deny' ? 'denied' : 'revoked' } : r)); } catch {}
 }, []);

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
 if (!chatInput.trim() || !activeChatUserId) return;
 try {
 const res = await api.sendDtmMessage(activeChatUserId, chatInput.trim());
 if (res.data) setChatMessages(prev => [...prev, res.data]);
 setChatInput('');
 } catch {}
 }, [chatInput, activeChatUserId]);

 const openChat = useCallback(async (userId: string) => {
 setActiveChatUserId(userId);
 try { const res = await api.getDtmChatMessages(userId); setChatMessages(res.data || []); } catch {}
 setSection('chat');
 }, []);

 if (loading) return <MiamoLoader text="Loading Date to Marry..." />;

 // First time — enable profile gate
 if (!profileEnabled && section !== 'browse') {
 return (
 <div className="min-h-screen bg-gradient-to-br from-rose-soft via-white to-rose-soft flex items-center justify-center p-6">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
 className="bg-miamo-card rounded-3xl border border-zinc-200 shadow-xl max-w-md w-full p-8 text-center space-y-5">
 <div className="text-5xl">🕉</div>
 <h2 className="text-xl font-bold text-zinc-900">Welcome to Date to Marry</h2>
 <p className="text-sm text-zinc-500">Build your matrimonial profile to access all features. Complete at least 60% to enable browsing & matching.</p>
 <div className="w-full bg-zinc-100 rounded-full h-3">
 <div className="h-full bg-gradient-to-r from-rose-alt to-rose-alt rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
 </div>
 <p className="text-xs text-zinc-400">{profileCompletion}% complete • Need 60% minimum</p>
 <button onClick={() => { setProfileEnabled(true); setSection('profile'); }}
 className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-main to-rose-main text-text-primary font-bold text-sm hover:shadow-lg transition">
 {profileCompletion >= 60 ? 'Enter Date to Marry' : 'Build Your Profile First'} →
 </button>
 <button onClick={() => { setProfileEnabled(true); setSection('browse'); }}
 className="text-xs text-zinc-400 hover:text-zinc-600 transition">or browse profiles first →</button>
 </motion.div>
 </div>
 );
 }

 return (
 <ErrorBoundary>
 <div className="min-h-screen bg-gradient-to-br from-rose-soft/50 via-white to-rose-soft/50">
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
 {profileCompletion < 60 && (
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
 {/* Filters Toggle */}
 <div className="flex items-center justify-end">
 <button onClick={() => setShowFilters(!showFilters)}
 className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition border',
 showFilters ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-miamo-card text-zinc-600 border-zinc-200 hover:bg-zinc-50')}>
 <Filter className="w-3.5 h-3.5" /> Filters {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
 </button>
 </div>

 {/* Filter Panel */}
 <AnimatePresence>
 {showFilters && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <Select value={filters.religion || ''} onChange={v => setFilters(f => ({ ...f, religion: v }))} options={RELIGIONS} placeholder="Religion" />
 <Select value={filters.caste || ''} onChange={v => setFilters(f => ({ ...f, caste: v }))} options={filters.religion ? (CASTES_BY_RELIGION[filters.religion] || ['Other']) : []} placeholder="Caste" />
 <Select value={filters.motherTongue || ''} onChange={v => setFilters(f => ({ ...f, motherTongue: v }))} options={MOTHER_TONGUES} placeholder="Mother Tongue" />
 <Select value={filters.manglik || ''} onChange={v => setFilters(f => ({ ...f, manglik: v }))} options={['Yes','No','any']} placeholder="Manglik" />
 <Select value={filters.maritalStatus || ''} onChange={v => setFilters(f => ({ ...f, maritalStatus: v }))} options={MARITAL_STATUSES} placeholder="Marital Status" />
 <Select value={filters.education || ''} onChange={v => setFilters(f => ({ ...f, education: v }))} options={EDUCATION_LEVELS} placeholder="Education" />
 <Select value={filters.diet || ''} onChange={v => setFilters(f => ({ ...f, diet: v }))} options={DIETS} placeholder="Diet" />
 <Input value={filters.city || ''} onChange={(v: string) => setFilters(f => ({ ...f, city: v }))} placeholder="City" />
 <Select value={filters.complexion || ''} onChange={v => setFilters(f => ({ ...f, complexion: v }))} options={COMPLEXIONS} placeholder="Complexion" />
 <Select value={filters.bodyType || ''} onChange={v => setFilters(f => ({ ...f, bodyType: v }))} options={BODY_TYPES} placeholder="Body Type" />
 <Input value={filters.minAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, minAge: v }))} placeholder="Min Age" type="number" />
 <Input value={filters.maxAge || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxAge: v }))} placeholder="Max Age" type="number" />
 <Select value={filters.minHeight || ''} onChange={v => setFilters(f => ({ ...f, minHeight: v }))} options={HEIGHTS} placeholder="Min Height" />
 <Select value={filters.maxHeight || ''} onChange={v => setFilters(f => ({ ...f, maxHeight: v }))} options={HEIGHTS} placeholder="Max Height" />
 <Input value={filters.minWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, minWeight: v }))} placeholder="Min Weight (kg)" type="number" />
 <Input value={filters.maxWeight || ''} onChange={(v: string) => setFilters(f => ({ ...f, maxWeight: v }))} placeholder="Max Weight (kg)" type="number" />
 </div>
 {/* Special Filters */}
 <div className="flex flex-wrap gap-2">
 <button onClick={() => setFilters(f => ({ ...f, numerologyMatch: f.numerologyMatch === 'true' ? '' : 'true' }))}
 className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
 filters.numerologyMatch === 'true' ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-miamo-card text-zinc-500 border-zinc-200')}>
 <Hash className="w-3 h-3 inline mr-1" /> Numerology Match
 </button>
 <button onClick={() => setFilters(f => ({ ...f, sortBy: f.sortBy === 'numerology' ? '' : 'numerology' }))}
 className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
 filters.sortBy === 'numerology' ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-miamo-card text-zinc-500 border-zinc-200')}>
 Sort by Numerology
 </button>
 </div>
 <div className="flex gap-2">
 <button onClick={applyFilters} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-main text-text-primary hover:shadow-lg transition">
 <Search className="w-3.5 h-3.5 inline mr-1.5" /> Search
 </button>
 <button onClick={async () => { setFilters({}); try { const res = await api.browseMatrimonialAdvanced({}).catch(() => api.browseMatrimonial({})); setBrowseProfiles(res.data || []); } catch {} }} className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition">Clear</button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Profile Grid */}
 {browseProfiles.length === 0 ? (
 <div className="text-center py-20 bg-miamo-card rounded-2xl border border-zinc-200">
 <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
 <p className="text-sm text-zinc-500 font-medium">No profiles found</p>
 <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {browseProfiles.map(p => (
 <MatrimonialCard key={p.id} profile={p} onView={() => viewProfile(p.user?.id || p.userId)} />
 ))}
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
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
 <div className="flex items-center gap-3 p-4 border-b border-zinc-100">
 <button onClick={() => setActiveChatUserId(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><ChevronLeft className="w-4 h-4 text-zinc-600" /></button>
 <p className="text-sm font-semibold text-zinc-900">Chat</p>
 </div>
 <div className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-50">
 {chatMessages.length === 0 && <p className="text-center text-xs text-zinc-400 py-10">No messages yet. Say hello!</p>}
 {chatMessages.map(m => (
 <div key={m.id} className={cn('max-w-[75%] rounded-2xl p-3', m.senderId === myProfile?.userId ? 'ml-auto bg-rose-main text-text-primary' : 'bg-miamo-card border border-zinc-200 text-zinc-800')}>
 <p className="text-sm">{m.message}</p>
 <p className={cn('text-[10px] mt-1', m.senderId === myProfile?.userId ? 'text-rose-soft' : 'text-zinc-400')}>{new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
 </div>
 ))}
 </div>
 <div className="p-3 border-t border-zinc-100 flex gap-2">
 <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
 className="flex-1 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-main/40" placeholder="Type a message..." />
 <button onClick={sendChatMessage} className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-main to-rose-main flex items-center justify-center hover:shadow-lg transition">
 <Send className="w-4 h-4 text-text-primary" />
 </button>
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
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
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
 <div key={req.id} className="bg-miamo-card rounded-xl border border-zinc-200 p-4 flex items-center gap-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
 <div className="bg-miamo-card rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
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
