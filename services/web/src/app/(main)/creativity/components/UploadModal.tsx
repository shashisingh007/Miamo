'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Sparkles, Paperclip } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CATEGORIES } from './constants';

/* ═══════════════════════════════════════════════════════
 UPLOAD MODAL
 ═══════════════════════════════════════════════════════ */
export function UploadModal({
 isOpen, onClose, categories, onCreated,
}: {
 isOpen: boolean; onClose: () => void; categories: any[]; onCreated: () => void;
}) {
 const [title, setTitle] = useState('');
 const [content, setContent] = useState('');
 const [selectedCat, setSelectedCat] = useState('');
 const [type, setType] = useState('image');
 const [creating, setCreating] = useState(false);
 const [done, setDone] = useState(false);
 const [mediaFile, setMediaFile] = useState<File | null>(null);
 const [mediaPreview, setMediaPreview] = useState('');
 const [hashtags, setHashtags] = useState<string[]>([]);
 const [hashtagInput, setHashtagInput] = useState('');
 const [aiHashtags, setAiHashtags] = useState<string[]>([]);
 const [loadingAi, setLoadingAi] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // Generate AI hashtag suggestions based on title/category
 const generateHashtags = () => {
 setLoadingAi(true);
 // Simulate AI recommendations based on category and title
 setTimeout(() => {
 const tagMap: Record<string, string[]> = {
 Sports: ['#athlete', '#fitness', '#gameday', '#sports', '#training', '#champion'],
 Music: ['#music', '#songwriter', '#newmusic', '#vibes', '#musician', '#beats'],
 Art: ['#art', '#creative', '#artwork', '#artist', '#masterpiece', '#gallery'],
 Dance: ['#dance', '#dancer', '#choreography', '#moves', '#groove', '#dancelife'],
 Comedy: ['#funny', '#comedy', '#humor', '#lol', '#comedian', '#jokes'],
 Fitness: ['#fitness', '#workout', '#gym', '#gains', '#healthy', '#fitlife'],
 Cooking: ['#cooking', '#foodie', '#recipe', '#homemade', '#delicious', '#chef'],
 Photography: ['#photography', '#photo', '#capture', '#portrait', '#lens', '#photooftheday'],
 Travel: ['#travel', '#wanderlust', '#explore', '#adventure', '#travelphotography', '#world'],
 Fashion: ['#fashion', '#style', '#ootd', '#fashionista', '#trendy', '#look'],
 };
 const baseTags = tagMap[selectedCat] || ['#miamo', '#creativity', '#talent', '#passion', '#creative', '#trending'];
 const titleTags = title.trim() ? [`#${title.replace(/\s+/g, '').toLowerCase().slice(0, 20)}`] : [];
 setAiHashtags([...titleTags, ...baseTags].slice(0, 8));
 setLoadingAi(false);
 }, 800);
 };

 const addHashtag = (tag: string) => {
 const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
 if (!hashtags.includes(cleaned) && hashtags.length < 10) {
 setHashtags(prev => [...prev, cleaned]);
 }
 };

 const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(t => t !== tag));

 const handleFileSelect = () => {
 const accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : type === 'performance' ? 'video/*,audio/*' : '*/*';
 if (fileInputRef.current) {
 fileInputRef.current.accept = accept;
 fileInputRef.current.click();
 }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setMediaFile(file);
 if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
 setMediaPreview(URL.createObjectURL(file));
 } else {
 setMediaPreview('');
 }
 e.target.value = '';
 };

 const handleCreate = async () => {
 if (!title.trim() || !selectedCat) return;
 setCreating(true);
 try {
 let uploadedMediaUrl = mediaPreview || undefined;
 // Upload actual file if available (blob URLs won't work server-side)
 if (mediaFile) {
 try {
 const formData = new FormData();
 formData.append('file', mediaFile);
 const uploadRes = await api.uploadPhoto(formData);
 if (uploadRes.data?.url) uploadedMediaUrl = uploadRes.data.url;
 } catch {
 // Fall back to sending without media if upload fails
 uploadedMediaUrl = undefined;
 }
 }
 await api.createCreativityItem({
 title: title.trim(),
 category: selectedCat,
 content: `${content.trim()}${hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : ''}`,
 mediaUrl: uploadedMediaUrl,
 type,
 });
 setDone(true);
 setTimeout(() => {
 setDone(false); onClose(); onCreated();
 setTitle(''); setContent(''); setSelectedCat(''); setMediaFile(null); setMediaPreview(''); setHashtags([]); setAiHashtags([]);
 }, 1200);
 } catch {} finally { setCreating(false); }
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={onClose} />
 <motion.div
 initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 className="fixed bottom-0 inset-x-0 max-h-[90vh] bg-miamo-card border-t border-border rounded-t-[20px] z-50 flex flex-col pb-[env(safe-area-inset-bottom)]"
 >
 {/* Hidden file input */}
 <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

 <div className="flex items-center justify-between px-5 py-4 border-b border-border">
 <h3 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
 <Upload className="w-4 h-4 text-rose-main" /> Share Your Creativity
 </h3>
 <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 {done ? (
 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center py-16">
 <div className="text-center">
 <div className="w-14 h-14 rounded-full bg-rose-alt/10 flex items-center justify-center mx-auto mb-4">
 <Check className="w-7 h-7 text-rose-alt" />
 </div>
 <p className="text-[14px] font-semibold text-text-primary">Published!</p>
 </div>
 </motion.div>
 ) : (
 <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
 {/* Media Upload */}
 <div>
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 block">Media</label>
 {mediaFile ? (
 <div className="relative rounded-xl overflow-hidden border border-border bg-miamo-surface/50">
 {mediaPreview && type === 'image' ? (
 <img src={mediaPreview} alt="Upload preview" className="w-full h-40 object-contain" />
 ) : mediaPreview && (type === 'video' || type === 'performance') ? (
 <video src={mediaPreview} className="w-full h-40 object-contain" controls />
 ) : (
 <div className="w-full h-28 flex items-center justify-center">
 <div className="text-center">
 <Paperclip className="w-8 h-8 text-text-secondary mx-auto mb-2" />
 <p className="text-xs text-text-muted">{mediaFile.name}</p>
 <p className="text-[10px] text-text-secondary">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
 </div>
 </div>
 )}
 <button onClick={() => { setMediaFile(null); setMediaPreview(''); }}
 className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
 <X className="w-3.5 h-3.5 text-text-primary" />
 </button>
 </div>
 ) : (
 <button onClick={handleFileSelect}
 className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-border bg-miamo-surface/50 hover:bg-miamo-surface flex flex-col items-center justify-center gap-2 transition-all">
 <Upload className="w-6 h-6 text-text-secondary" />
 <span className="text-[11px] text-text-muted">Tap to select photo, video, or file</span>
 </button>
 )}
 </div>

 {/* Title */}
 <div>
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 block">Title *</label>
 <input value={title} onChange={e => setTitle(e.target.value)}
 placeholder="What did you create?"
 className="w-full h-11 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 focus:border-border focus:outline-none placeholder:text-text-muted" />
 </div>

 {/* Category — REQUIRED */}
 <div>
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 block">Category *</label>
 <div className="flex flex-wrap gap-2">
 {categories.filter(c => c.name !== 'general').map(c => {
 const CatIcon = CATEGORIES.find(cc => cc.name === c.name)?.icon || Sparkles;
 const isActive = selectedCat === c.name;
 return (
 <button key={c.id || c.name} onClick={() => setSelectedCat(c.name)}
 className={cn(
 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border',
 isActive
 ? 'bg-miamo-surface border-border text-text-primary'
 : 'bg-miamo-surface/50 border-border text-text-muted hover:text-text-muted',
 )}
 >
 <CatIcon className="w-3 h-3" /> {c.name}
 </button>
 );
 })}
 </div>
 </div>

 {/* Type */}
 <div>
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 block">Content Type</label>
 <div className="flex gap-2">
 {['image', 'video', 'text', 'project', 'performance'].map(t => (
 <button key={t} onClick={() => setType(t)}
 className={cn(
 'px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all capitalize',
 type === t ? 'bg-miamo-surface border-border text-text-primary' : 'bg-miamo-surface/50 border-border text-text-muted',
 )}
 >
 {t}
 </button>
 ))}
 </div>
 </div>

 {/* Caption/Description */}
 <div>
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 block">Caption</label>
 <textarea value={content} onChange={e => setContent(e.target.value)}
 placeholder="Write a caption for your post…"
 className="w-full h-20 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 py-3 resize-none focus:border-border focus:outline-none placeholder:text-text-muted" />
 </div>

 {/* Hashtags */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">Hashtags</label>
 <button onClick={generateHashtags} disabled={loadingAi}
 className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-main/10 text-rose-main text-[10px] font-semibold hover:bg-rose-main/20 transition-all disabled:opacity-50">
 <Sparkles className="w-3 h-3" /> {loadingAi ? 'Thinking…' : 'AI Suggest'}
 </button>
 </div>

 {/* Current hashtags */}
 {hashtags.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-2">
 {hashtags.map(tag => (
 <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-main/10 text-rose-main text-[11px] font-semibold">
 {tag}
 <button onClick={() => removeHashtag(tag)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
 </span>
 ))}
 </div>
 )}

 {/* AI suggested hashtags */}
 {aiHashtags.length > 0 && (
 <div className="mb-2">
 <p className="text-[9px] text-text-secondary uppercase tracking-wider mb-1.5">Suggested</p>
 <div className="flex flex-wrap gap-1.5">
 {aiHashtags.filter(t => !hashtags.includes(t)).map(tag => (
 <button key={tag} onClick={() => addHashtag(tag)}
 className="px-2.5 py-1 rounded-lg bg-miamo-surface border border-border text-text-muted text-[11px] font-medium hover:bg-rose-main/10 hover:text-rose-main hover:border-rose-main/20 transition-all">
 + {tag}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Manual hashtag input */}
 <div className="flex gap-2">
 <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter' && hashtagInput.trim()) { addHashtag(hashtagInput.trim()); setHashtagInput(''); } }}
 placeholder="Add custom hashtag…"
 className="flex-1 h-9 rounded-xl bg-miamo-surface border border-border text-text-primary text-[12px] px-3 focus:border-border focus:outline-none placeholder:text-text-muted" />
 <button onClick={() => { if (hashtagInput.trim()) { addHashtag(hashtagInput.trim()); setHashtagInput(''); } }}
 className="px-3 h-9 rounded-xl bg-miamo-surface text-text-muted text-[11px] font-semibold hover:bg-miamo-surface transition-all">Add</button>
 </div>
 </div>

 {/* Submit */}
 <button
 onClick={handleCreate}
 disabled={!title.trim() || !selectedCat || creating}
 className={cn(
 'w-full h-12 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2',
 title.trim() && selectedCat
 ? 'bg-miamo-card text-text-primary hover:bg-miamo-card/90'
 : 'bg-miamo-surface text-text-secondary cursor-not-allowed',
 )}
 >
 {creating ? <img src="/assets/logo.svg" alt="" className="w-5 h-5 rounded-lg animate-pulse" /> : <>
 <Sparkles className="w-4 h-4" /> Publish
 </>}
 </button>
 </div>
 )}
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
