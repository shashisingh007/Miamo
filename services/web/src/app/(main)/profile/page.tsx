'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Camera, Edit3, MapPin, Briefcase, Plus, CheckCircle, Save, X, Eye, Shield, ChevronLeft, ChevronRight, ZoomIn, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, ScoreRing } from '@/components/ui';
import { ProfilePageSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { INTEREST_CATEGORIES, PROFILE_PROMPTS } from '@/lib/constants';
import { useAuthStore } from '@/stores';
import { useTrackPageView, useTrackScrollDepth, trackClick } from '@/hooks/useTrackActivity';
import { useToast } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StoryCreateModal } from '@/app/(main)/stories/components/StoryCreateModal';
import { StoryViewer } from '@/app/(main)/stories/components/StoryViewer';
import { MediaPicker, type MediaPickerResult } from '@/components/MediaPicker';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import {
 LOOKING_FOR_OPTIONS, EDUCATION_OPTIONS, HEIGHT_OPTIONS, LANGUAGE_OPTIONS,
 DRINKING_OPTIONS, SMOKING_OPTIONS, EXERCISE_OPTIONS, DIET_OPTIONS,
 PETS_OPTIONS, CHILDREN_OPTIONS, RELIGION_OPTIONS, POLITICS_OPTIONS,
} from '@/lib/profileOptions';

/* ═══ Animated Score Ring (counts up on mount) ═══ */
function AnimatedScoreRing({ score, size = 80, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
 const [display, setDisplay] = useState(0);
 useEffect(() => {
 let current = 0;
 const step = Math.max(1, Math.ceil(score / 40));
 const timer = setInterval(() => {
 current += step;
 if (current >= score) { current = score; clearInterval(timer); }
 setDisplay(current);
 }, 30);
 return () => clearInterval(timer);
 }, [score]);
 return <ScoreRing score={display} size={size} strokeWidth={strokeWidth} />;
}

/* ═══ Photo Lightbox ═══ */
function PhotoLightbox({ photos, initialIndex, onClose }: { photos: any[]; initialIndex: number; onClose: () => void }) {
 const [idx, setIdx] = useState(initialIndex);
 useEffect(() => {
 const handler = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, photos.length - 1));
 if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
 };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, [onClose, photos.length]);

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center"
 onClick={onClose}
 >
 <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-miamo-card/10 flex items-center justify-center hover:bg-miamo-card/20 transition-colors" onClick={onClose}>
 <X className="w-5 h-5 text-text-primary" />
 </button>
 <div className="relative w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
 <AnimatePresence mode="wait">
 <motion.img
 key={idx}
 src={photos[idx]?.url}
 alt={photos[idx]?.description || `Photo ${idx + 1} of ${photos.length}`}
 className="w-full rounded-2xl object-contain max-h-[80vh]"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 />
 </AnimatePresence>
 {idx > 0 && (
 <button className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center" onClick={() => setIdx(i => i - 1)}>
 <ChevronLeft className="w-5 h-5 text-text-primary" />
 </button>
 )}
 {idx < photos.length - 1 && (
 <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center" onClick={() => setIdx(i => i + 1)}>
 <ChevronRight className="w-5 h-5 text-text-primary" />
 </button>
 )}
 <div className="flex justify-center gap-1.5 mt-3">
 {photos.map((_: any, i: number) => (
 <div key={i} className={cn('w-2 h-2 rounded-full transition-all', i === idx ? 'bg-miamo-card scale-125' : 'bg-miamo-card/30')} />
 ))}
 </div>
 </div>
 </motion.div>
 );
}

export default function ProfilePage() {
 const [profile, setProfile] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [editing, setEditing] = useState(false);
 const [editForm, setEditForm] = useState<{ bio: string; city: string; cityLat: number | null; cityLng: number | null; profession: string; datingIntent: string; education: string; height: string; languages: string; drinking: string; smoking: string; fitness: string; diet: string; pets: string; children: string; religion: string; politicalViews: string }>({ bio: '', city: '', cityLat: null, cityLng: null, profession: '', datingIntent: '', education: '', height: '', languages: '', drinking: '', smoking: '', fitness: '', diet: '', pets: '', children: '', religion: '', politicalViews: '' });
 const [detectingLoc, setDetectingLoc] = useState(false);
 const [saving, setSaving] = useState(false);
 const [showAddInterest, setShowAddInterest] = useState(false);
 const [showAddPrompt, setShowAddPrompt] = useState(false);
 const [newPromptQ, setNewPromptQ] = useState('');
 const [newPromptA, setNewPromptA] = useState('');
 const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
 const [showStoryCreate, setShowStoryCreate] = useState(false);
 const [viewingOwnStory, setViewingOwnStory] = useState<any>(null);
 const [myStoryGroup, setMyStoryGroup] = useState<any>(null);
 const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
 const { updateUser, user: authUser } = useAuthStore();
 const photoInputRef = useRef<HTMLInputElement>(null);
 const coverInputRef = useRef<HTMLInputElement>(null);
 const heroRef = useRef<HTMLDivElement>(null);
 const toast = useToast();

 useTrackPageView('profile');
 useTrackScrollDepth('profile');

 // Parallax for hero
 const { scrollY } = useScroll();
 const heroY = useTransform(scrollY, [0, 300], [0, 80]);
 const heroScale = useTransform(scrollY, [0, 300], [1, 1.1]);

 const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 // Open the media picker modal for this file
 setShowPhotoUploadModal(true);
 e.target.value = '';
 };

 const handleMediaPickerResult = async (result: MediaPickerResult) => {
 // Convert data URL to a Blob for FormData upload
 const res = await fetch(result.dataUrl);
 const blob = await res.blob();
 const preview = result.dataUrl;
 setProfile((prev: any) => ({
 ...prev,
 user: { ...(prev?.user || prev), photos: [{ url: preview }, ...(prev?.user?.photos || prev?.photos || [])] },
 }));
 const formData = new FormData();
 formData.append('photo', blob, 'photo.jpg');
 api.uploadPhoto(formData).then(() => {
 loadProfile();
 toast.success('Photo uploaded', 'Your new photo is now visible');
 }).catch(() => {
 toast.error('Upload failed', 'Please try again');
 loadProfile(); // revert optimistic
 });
 setShowPhotoUploadModal(false);
 };

 const loadProfile = () => {
 setLoading(true);
 api.getMyProfile().then(res => {
 setProfile(res.data);
 const prof = (res.data as any)?.profile || res.data || {};
 setEditForm({ bio: prof.bio || '', city: prof.city || '', cityLat: prof.cityLat ?? null, cityLng: prof.cityLng ?? null, profession: prof.profession || '', datingIntent: prof.datingIntent || prof.intent || '', education: prof.education || '', height: prof.height || '', languages: prof.languages || '', drinking: prof.drinking || '', smoking: prof.smoking || '', fitness: prof.fitness || '', diet: prof.diet || '', pets: prof.pets || '', children: prof.children || '', religion: prof.religion || '', politicalViews: prof.politicalViews || '' });
 }).catch(() => {}).finally(() => setLoading(false));
 };

 useEffect(() => { loadProfile(); }, []);

 const loadOwnStories = () => {
 api.getMyStories().then(r => {
 const list = r.data || [];
 if (list.length > 0) {
 setMyStoryGroup({ user: authUser, isOwn: true, stories: list, viewed: false });
 } else {
 setMyStoryGroup(null);
 }
 }).catch(() => setMyStoryGroup(null));
 };
 useEffect(() => { loadOwnStories(); }, [authUser?.id]);

 if (loading) return <ProfilePageSkeleton />;

 if (!profile) return (
 <div className="h-full flex items-center justify-center">
 <div className="text-center"><p className="text-text-muted">Could not load profile. Please log in.</p></div>
 </div>
 );

 const user = { ...(authUser || {}), ...(profile.user || {}) };
 const prof = profile.profile || profile;
 const photos = user.photos || profile.photos || [];
 const interests = profile.interests || user.interests || [];
 const prompts = profile.prompts || user.prompts || [];
 const profileScore = prof.profileScore || 70;

 const completionSteps = [
 { label: 'Basic info', done: !!user.displayName, action: () => setEditing(true) },
 { label: 'Photos (3+)', done: photos.length >= 3, action: () => photoInputRef.current?.click() },
 { label: 'Bio', done: !!prof.bio, action: () => setEditing(true) },
 { label: 'Interests (5+)', done: interests.length >= 5, action: () => setShowAddInterest(true) },
 { label: 'Prompts (2+)', done: prompts.length >= 2, action: () => setShowAddPrompt(true) },
 { label: 'Relationship intent', done: !!prof.intent, action: () => setEditing(true) },
 { label: 'Verification', done: user.verified, action: () => {} },
 ];
 const doneCount = completionSteps.filter(s => s.done).length;
 const profilePercent = Math.round((doneCount / completionSteps.length) * 100);

 return (
 <ErrorBoundary>
 <div className="max-w-3xl mx-auto space-y-6 pb-8">
 {/* ═══ HERO SECTION WITH PARALLAX ═══ */}
 <Card className="overflow-hidden relative">
 <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
 <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
 <div ref={heroRef} className="h-40 relative overflow-hidden">
 <motion.div
 style={{ y: heroY, scale: heroScale }}
 className="absolute inset-0 bg-gradient-to-br from-rose-main/30 via-miamo-elevated to-rose- /30"
 />
 {/* Decorative orbs */}
 <div className="absolute top-4 right-8 w-20 h-20 rounded-full bg-rose-light/10 animate-float blur-lg" />
 <div className="absolute bottom-2 left-12 w-16 h-16 rounded-full bg-rose-alt/10 animate-float-delayed blur-lg" />
 <button onClick={() => coverInputRef.current?.click()} className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-text-primary p-2 rounded-xl hover:bg-black/50 transition-colors z-10">
 <Camera className="w-4 h-4" />
 </button>
 </div>
 <div className="px-6 pb-6 -mt-14 relative z-10">
 <div className="flex items-end gap-4">
 <motion.div
 className="relative"
 whileHover={{ scale: 1.05 }}
 transition={{ type: 'spring', stiffness: 300, damping: 20 }}
 >
 <button
 onClick={() => myStoryGroup ? setViewingOwnStory(myStoryGroup) : setShowStoryCreate(true)}
 className={cn(
 'rounded-full p-[3px] transition-all',
 myStoryGroup ? 'bg-gradient-to-br from-rose-alt via-rose-main to-rose-main shadow-[0_4px_14px_rgba(201,120,86,0.3)]' : 'bg-transparent'
 )}
 aria-label={myStoryGroup ? 'View your story' : 'Add story'}
 >
 <div className="rounded-full bg-white p-[2px]">
 <Avatar src={photos[0]?.url} name={user.displayName || 'User'} size="xl" className="w-24 h-24 text-2xl shadow-xl" />
 </div>
 </button>
 <button onClick={(e) => { e.stopPropagation(); setShowStoryCreate(true); }} className="absolute -bottom-0.5 left-1 w-8 h-8 bg-gradient-rose rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:scale-110 transition-transform" aria-label="Add story">
 <Plus className="w-4 h-4 text-white" />
 </button>
 <button onClick={() => setShowPhotoUploadModal(true)} className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-rose rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:scale-110 transition-transform">
 <Camera className="w-3.5 h-3.5 text-text-primary" />
 </button>
 {user.verified && (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-rose-alt to-rose-alt rounded-full flex items-center justify-center border-2 border-white shadow-md"
 title={`Verified ${user.verifiedAt ? `on ${new Date(user.verifiedAt).toLocaleDateString()}` : ''}`}
 >
 <Shield className="w-3 h-3 text-text-primary" />
 </motion.div>
 )}
 </motion.div>
 <div className="flex-1 mb-1">
 <div className="flex items-center gap-2">
 <h1 className="text-xl font-bold">{user.displayName}</h1>
 {user.verified && <Badge variant="success">Verified</Badge>}
 </div>
 <p className="text-sm text-text-muted flex items-center gap-2 mt-0.5">
 <span>@{user.username}</span><span>•</span><MapPin className="w-3 h-3" />{prof.city || ''}
 </p>
 </div>
 <Button variant="secondary" size="sm" onClick={() => {
 if (editing) {
 setSaving(true);
 api.updateProfile({ ...editForm, height: editForm.height ? parseInt(editForm.height as any) || null : null, cityLat: editForm.cityLat, cityLng: editForm.cityLng } as any).then(() => { loadProfile(); updateUser(editForm); setEditing(false); toast.success('Profile saved'); }).catch(() => toast.error('Save failed')).finally(() => setSaving(false));
 } else {
 setEditing(true);
 trackClick('edit-profile');
 }
 }}>
 {editing ? (saving ? 'Saving…' : <><Save className="w-3.5 h-3.5" /> Save</>) : <><Edit3 className="w-3.5 h-3.5" /> Edit</>}
 </Button>
 {editing && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>}
 </div>

 {/* ═══ SOCIAL PROOF ═══ */}
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="flex items-center gap-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-rose-main/10 to-rose-soft/40 border border-border/30"
 >
 <div className="flex items-center gap-2">
 <div className="flex -space-x-2">
 {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-r from-rose-light to-rose-light border-2 border-white" />)}
 </div>
 <span className="text-xs text-text-secondary">
 <Eye className="w-3 h-3 inline mb-0.5" /> <strong className="text-rose">{Math.floor(Math.random() * 30) + 5}</strong> people viewed this week
 </span>
 </div>
 <div className="ml-auto flex items-center gap-1.5">
 <TrendingUp className="w-3 h-3 text-rose-main" />
 <span className="text-[10px] font-bold text-rose-main">+12%</span>
 </div>
 </motion.div>
 </div>
 </Card>

 <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 px-6 lg:px-0">
 <div className="space-y-5">
 {/* ═══ PHOTO GRID WITH LIGHTBOX ═══ */}
 {photos.length > 0 && (
 <Card className="p-5">
 <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">Photos <Badge variant="muted">{photos.length}</Badge></h3>
 <div className="grid grid-cols-3 gap-2.5">
 {photos.map((photo: any, i: number) => (
 <motion.div
 key={i}
 className="tilt-3d cursor-pointer group relative"
 whileHover={{ scale: 1.03, y: -2 }}
 whileTap={{ scale: 0.97 }}
 onClick={() => setLightboxIndex(i)}
 >
 <div className="tilt-3d-inner aspect-square rounded-2xl overflow-hidden bg-miamo-surface">
 <img loading="lazy" src={photo.url} alt={photo.description || `Profile photo ${i + 1}`} className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
 </div>
 <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
 <ZoomIn className="w-5 h-5 text-text-primary" />
 </div>
 </motion.div>
 ))}
 <motion.button
 whileHover={{ scale: 1.03 }}
 whileTap={{ scale: 0.97 }}
 onClick={() => setShowPhotoUploadModal(true)}
 className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-rose-light hover:border-rose hover:bg-miamo-surface/50 transition-all"
 >
 <Plus className="w-5 h-5" />
 <span className="text-[10px] font-medium">Add Photo</span>
 </motion.button>
 </div>
 </Card>
 )}

 {/* About Section */}
 <Card className="p-5">
 <h3 className="text-sm font-semibold mb-2">About</h3>
 {editing ? (
 <div className="space-y-3">
 <div><label className="text-xs text-text-muted">Bio</label><textarea value={editForm.bio} onChange={e => setEditForm(f => ({...f, bio: e.target.value}))} className="input-premium w-full mt-1 text-sm resize-none" rows={3} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted flex items-center justify-between"><span>City</span><button type="button" disabled={detectingLoc} onClick={() => {
 if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
 setDetectingLoc(true);
 navigator.geolocation.getCurrentPosition(async (pos) => {
 try { const r = await api.nearestCity(pos.coords.latitude, pos.coords.longitude); const c = r.data; setEditForm(f => ({ ...f, city: c.display, cityLat: c.lat, cityLng: c.lng })); toast.success(`Detected: ${c.name}`); } catch { toast.error('Could not resolve city'); } finally { setDetectingLoc(false); }
 }, () => { toast.error('Location permission denied'); setDetectingLoc(false); }, { enableHighAccuracy: false, timeout: 10000 });
 }} className="text-[10px] text-rose-main hover:underline disabled:opacity-50">{detectingLoc ? 'Detecting…' : 'Use my location'}</button></label><div className="mt-1"><CityAutocomplete value={editForm.city} onChange={(display, city) => setEditForm(f => ({ ...f, city: display, cityLat: city?.lat ?? null, cityLng: city?.lng ?? null }))} placeholder="Start typing your city…" /></div></div>
 <div><label className="text-xs text-text-muted">Profession</label><input value={editForm.profession} onChange={e => setEditForm(f => ({...f, profession: e.target.value}))} className="input-premium w-full mt-1 text-sm" /></div>
 </div>
 <div><label className="text-xs text-text-muted">Relationship Intent</label><select value={editForm.datingIntent} onChange={e => setEditForm(f => ({...f, datingIntent: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{LOOKING_FOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted">Education</label><select value={editForm.education} onChange={e => setEditForm(f => ({...f, education: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{EDUCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div><label className="text-xs text-text-muted">Height</label><select value={editForm.height} onChange={e => setEditForm(f => ({...f, height: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{HEIGHT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 </div>
 <div><label className="text-xs text-text-muted">Languages</label><input value={editForm.languages} onChange={e => setEditForm(f => ({...f, languages: e.target.value}))} className="input-premium w-full mt-1 text-sm" placeholder={`e.g. ${LANGUAGE_OPTIONS.slice(0,3).map(o=>o.label).join(', ')}`} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted">Drinking</label><select value={editForm.drinking} onChange={e => setEditForm(f => ({...f, drinking: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{DRINKING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div><label className="text-xs text-text-muted">Smoking</label><select value={editForm.smoking} onChange={e => setEditForm(f => ({...f, smoking: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{SMOKING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted">Fitness</label><select value={editForm.fitness} onChange={e => setEditForm(f => ({...f, fitness: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{EXERCISE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div><label className="text-xs text-text-muted">Diet</label><select value={editForm.diet} onChange={e => setEditForm(f => ({...f, diet: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{DIET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted">Pets</label><select value={editForm.pets} onChange={e => setEditForm(f => ({...f, pets: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{PETS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div><label className="text-xs text-text-muted">Children</label><select value={editForm.children} onChange={e => setEditForm(f => ({...f, children: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{CHILDREN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="text-xs text-text-muted">Religion</label><select value={editForm.religion} onChange={e => setEditForm(f => ({...f, religion: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{RELIGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 <div><label className="text-xs text-text-muted">Political Views</label><select value={editForm.politicalViews} onChange={e => setEditForm(f => ({...f, politicalViews: e.target.value}))} className="input-premium w-full mt-1 text-sm"><option value="">—</option>{POLITICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
 </div>
 </div>
 ) : (
 <>
 <p className="text-sm text-text-secondary leading-relaxed">{prof.bio || 'No bio yet — tell people about yourself!'}</p>
 <div className="flex items-center gap-3 mt-3 flex-wrap">
 {prof.intent && <Badge>{prof.intent}</Badge>}
 {prof.age && <Badge variant="muted">{prof.age}, {prof.city}</Badge>}
 {prof.profession && <Badge variant="muted"><Briefcase className="w-3 h-3" /> {prof.profession}</Badge>}
 </div>
 </>
 )}
 </Card>

 {/* ═══ PROMPTS — Elegant card design ═══ */}
 {(prompts.length > 0 || editing) && (
 <Card className="p-5">
 <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">Prompts</h3>
 <Button variant="ghost" size="sm" onClick={() => setShowAddPrompt(!showAddPrompt)}><Plus className="w-3.5 h-3.5" /> Add</Button>
 </div>
 {showAddPrompt && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
 className="mb-3 bg-gradient-to-br from-rose-main/10 to-rose-soft/40 rounded-2xl p-4 border border-border/30 space-y-2">
 <select value={newPromptQ} onChange={e => setNewPromptQ(e.target.value)} className="input-premium w-full text-sm">
 <option value="">Select a prompt…</option>
 {PROFILE_PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 <textarea value={newPromptA} onChange={e => setNewPromptA(e.target.value)} placeholder="Your answer…" className="input-premium w-full text-sm resize-none" rows={2} />
 <div className="flex gap-2">
 <Button size="sm" disabled={!newPromptQ || !newPromptA.trim()} onClick={async () => {
 const updated = [...prompts, { question: newPromptQ, answer: newPromptA.trim() }];
 try { await api.updatePrompts(updated); setShowAddPrompt(false); setNewPromptQ(''); setNewPromptA(''); loadProfile(); toast.success('Prompt added'); } catch (e) { toast.error('Failed to add prompt'); }
 }}>Save</Button>
 <Button variant="ghost" size="sm" onClick={() => setShowAddPrompt(false)}>Cancel</Button>
 </div>
 </motion.div>
 )}
 <div className="space-y-3">
 {prompts.map((p: any, i: number) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className="bg-gradient-to-br from-miamo-elevated/50 to-rose-main/10 rounded-2xl p-4 border border-border/20"
 >
 <p className="text-xs text-rose font-semibold mb-1.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {p.question}</p>
 <p className="text-sm text-text-secondary leading-relaxed">{p.answer}</p>
 </motion.div>
 ))}
 </div>
 </Card>
 )}

 {/* ═══ INTERESTS — Animated colorful tags ═══ */}
 <Card className="p-5">
 <h3 className="text-sm font-semibold mb-3">Interests</h3>
 <div className="flex flex-wrap gap-2">
 {interests.map((interest: any, i: number) => (
 <motion.span
 key={interest.name || interest}
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.04 }}
 whileHover={{ scale: 1.08, y: -2 }}
 className="px-3 py-1.5 bg-gradient-to-r from-rose-main/15 to-rose-soft/60 text-rose rounded-full text-xs font-medium border border-border/40 cursor-default shadow-sm hover:shadow-md transition-shadow"
 >
 {interest.name || interest}
 </motion.span>
 ))}
 <button onClick={() => setShowAddInterest(!showAddInterest)} className="px-3 py-1.5 border border-dashed border-border text-text-muted rounded-full text-xs hover:border-rose-main hover:text-rose transition-colors"><Plus className="w-3 h-3 inline mr-1" />Add more</button>
 </div>
 {showAddInterest && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
 className="mt-3 bg-miamo-elevated/50 rounded-xl p-4 border border-border/30">
 <p className="text-xs text-text-muted mb-2">Select interests to add:</p>
 <div className="flex flex-wrap gap-1.5">
 {INTEREST_CATEGORIES.filter(ic => !interests.some((i: any) => (i.name || i) === ic)).map(ic => (
 <button key={ic} onClick={async () => {
 const updated = [...interests.map((i: any) => i.name || i), ic];
 try { await api.updateInterests(updated); loadProfile(); toast.success(`Added "${ic}"`); } catch (e) { toast.error('Failed to add interest'); }
 }} className="px-2.5 py-1 bg-miamo-card border border-border text-text-muted rounded-full text-xs hover:border-rose-main hover:text-rose hover:bg-miamo-surface/50 transition-all">
 {ic}
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </Card>
 </div>

 {/* ═══ SIDEBAR ═══ */}
 <div className="space-y-5">
 {/* Animated Score Ring */}
 <Card className="p-5 text-center">
 <h3 className="text-sm font-semibold mb-3">Profile Score</h3>
 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="flex justify-center mb-3">
 <AnimatedScoreRing score={profilePercent} size={88} strokeWidth={5} />
 </motion.div>
 <p className="text-sm font-semibold text-text-primary">{profilePercent}% Complete</p>
 <p className="text-xs text-text-muted mt-1">
 {profilePercent >= 70
 ? <span className="text-rose-main">✓ Matching unlocked!</span>
 : `Complete ${70 - profilePercent}% more to unlock matching`}
 </p>
 </Card>

 {/* ═══ COMPLETION CHECKLIST with animations ═══ */}
 <Card className="p-5">
 <h3 className="text-sm font-semibold mb-3">Completion Checklist</h3>
 <div className="space-y-2">
 {completionSteps.map((step, i) => (
 <motion.button
 key={i}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.3 + i * 0.06 }}
 className="flex items-center gap-2.5 w-full text-left hover:bg-miamo-surface/50 rounded-xl px-2 py-1.5 transition-all group"
 onClick={step.action}
 >
 {step.done ? (
 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
 <CheckCircle className="w-4.5 h-4.5 text-rose-alt" />
 </motion.div>
 ) : (
 <div className="w-4.5 h-4.5 border-2 border-border rounded-full group-hover:border-rose-main transition-colors" />
 )}
 <span className={cn('text-xs', step.done ? 'text-text-secondary line-through' : 'text-text-secondary group-hover:text-rose')}>
 {step.label}
 </span>
 </motion.button>
 ))}
 </div>
 </Card>

 {/* Verification CTA */}
 {!user.verified && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
 <Card className="p-5 border-rose-main/20 bg-gradient-to-br from-rose-main/10 to-rose-soft/40">
 <div className="flex items-center gap-2 mb-2">
 <Shield className="w-4 h-4 text-rose" />
 <h3 className="text-sm font-semibold">Get Verified</h3>
 </div>
 <p className="text-xs text-text-muted mb-3">Build trust and attract 3x more matches with the verified badge.</p>
 <Button size="sm" className="w-full">Start Verification</Button>
 </Card>
 </motion.div>
 )}
 </div>
 </div>

 {/* ═══ PHOTO LIGHTBOX ═══ */}
 <AnimatePresence>
 {lightboxIndex !== null && (
 <PhotoLightbox photos={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
 )}
 {showStoryCreate && (
 <StoryCreateModal onClose={() => setShowStoryCreate(false)} onCreated={() => { setShowStoryCreate(false); loadOwnStories(); toast.success('Story shared'); }} />
 )}
 {viewingOwnStory && (
 <StoryViewer storyGroup={viewingOwnStory} onClose={() => { setViewingOwnStory(null); loadOwnStories(); }} onRefresh={loadOwnStories} />
 )}
 </AnimatePresence>

 {/* ═══ PHOTO UPLOAD MODAL (with filters + compression) ═══ */}
 <AnimatePresence>
 {showPhotoUploadModal && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
 className="bg-miamo-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
 <div className="flex items-center justify-between p-4 border-b border-border">
 <h2 className="text-lg font-bold text-text-primary">Upload Photo</h2>
 <button onClick={() => setShowPhotoUploadModal(false)} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center hover:bg-miamo-elevated">
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="p-4 overflow-y-auto flex-1">
 <MediaPicker accept={['image']} showFilters={true} showTrim={false}
 onMedia={handleMediaPickerResult} onClear={() => {}} />
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </ErrorBoundary>
 );
}
