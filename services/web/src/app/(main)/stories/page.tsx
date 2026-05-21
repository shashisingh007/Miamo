'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus, Heart, MessageCircle, Eye, EyeOff,
 Sparkles, Clock, Share2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { FloatingSparkles, parseStoryContent, getBackgroundGradient } from './components/constants';
import { StoryCreateModal } from './components/StoryCreateModal';
import { StoryViewer } from './components/StoryViewer';

/* ═══ My Story Insights Card ═══ */
function MyStoryInsights({ stories, onView, onDelete, onPostToFeed }: {
 stories: any[]; onView: (idx: number) => void; onDelete: (id: string) => void;
 onPostToFeed: (id: string) => void;
}) {
 if (stories.length === 0) return null;

 return (
 <Card className="p-0 overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-rose-main/10 to-rose-50 border-b border-border/50">
 <h3 className="font-bold text-text-primary flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-rose-light" /> Your Active Stories
 </h3>
 <p className="text-xs text-text-muted mt-0.5">{stories.length} stor{stories.length !== 1 ? 'ies' : 'y'} live</p>
 </div>
 <div className="divide-y divide-border">
 {stories.map((s: any, i: number) => {
 const { text, background } = parseStoryContent(s.content || '');
 const bgGradient = getBackgroundGradient(background);
 const isPopular = (s._count?.likes || 0) >= 3;
 return (
 <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-miamo-surface/50 transition-colors">
 {/* Mini preview */}
 <motion.button whileHover={{ scale: 1.05 }} onClick={() => onView(i)}
 className={cn('w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 relative',
 s.mediaUrl ? '' : `bg-gradient-to-br ${bgGradient}`)}>
 {s.mediaUrl ? <img loading="lazy" src={s.mediaUrl} alt="" className="w-full h-full object-cover" /> :
 <p className="absolute inset-0 flex items-center justify-center p-1 text-text-primary text-[8px] font-bold text-center leading-tight">{text?.substring(0, 40)}</p>}
 {isPopular && (
 <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
 <Sparkles className="w-2.5 h-2.5 text-text-primary" />
 </div>
 )}
 </motion.button>

 {/* Stats */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-text-primary truncate">{text?.substring(0, 50) || 'Photo story'}</p>
 <div className="flex items-center gap-3 mt-1">
 <span className="flex items-center gap-1 text-[10px] text-text-muted"><Eye className="w-3 h-3" /> {s._count?.views || 0}</span>
 <span className="flex items-center gap-1 text-[10px] text-text-muted"><Heart className="w-3 h-3" /> {s._count?.likes || 0}</span>
 <span className="flex items-center gap-1 text-[10px] text-text-muted"><MessageCircle className="w-3 h-3" /> {s._count?.comments || 0}</span>
 </div>
 <p className="text-[10px] text-text-secondary mt-0.5">
 <Clock className="w-2.5 h-2.5 inline mr-0.5" />
 {new Date(s.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </p>
 </div>

 {/* Actions */}
 <div className="flex gap-1">
 {isPopular && (
 <motion.button whileTap={{ scale: 0.9 }} onClick={() => onPostToFeed(s.id)} title="Post to Feed"
 className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors">
 <Share2 className="w-3.5 h-3.5 text-indigo-500" />
 </motion.button>
 )}
 <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDelete(s.id)} title="Delete"
 className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
 <Trash2 className="w-3.5 h-3.5 text-red-400" />
 </motion.button>
 </div>
 </div>
 );
 })}
 </div>
 </Card>
 );
}

/* ═══ Main Stories Page ═══ */
export default function StoriesPage() {
 const [storyGroups, setStoryGroups] = useState<any[]>([]);
 const [myStories, setMyStories] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showCreate, setShowCreate] = useState(false);
 const [viewingGroup, setViewingGroup] = useState<any>(null);
 const [viewingIndex, setViewingIndex] = useState(0);
 const [hideViewed, setHideViewed] = useState(true);

 useTrackPageView('stories');
 useTrackScrollDepth('stories');

 const loadStories = useCallback(() => {
 setLoading(true);
 Promise.all([
 api.getStories().then(r => r.data || []).catch(() => []),
 api.getMyStories().then(r => r.data || []).catch(() => []),
 ]).then(([groups, mine]) => {
 setStoryGroups(groups);
 setMyStories(mine);
 }).finally(() => setLoading(false));
 }, []);

 useEffect(() => { loadStories(); }, [loadStories]);

 const ownGroup = storyGroups.find((g: any) => g.isOwn);
 const allMatchGroups = storyGroups.filter((g: any) => !g.isOwn);
 // Sort: unviewed first, then viewed. Hide fully-viewed if toggle is on.
 const matchGroups = allMatchGroups
 .filter((g: any) => hideViewed ? !g.viewed : true)
 .sort((a: any, b: any) => (a.viewed ? 1 : 0) - (b.viewed ? 1 : 0));
 const viewedCount = allMatchGroups.filter((g: any) => g.viewed).length;

 const handleViewGroup = (group: any, idx = 0) => {
 setViewingGroup(group);
 setViewingIndex(idx);
 };

 const handleDeleteStory = async (id: string) => {
 try { await api.deleteStory(id); loadStories(); } catch {}
 };

 const handlePostToFeed = async (id: string) => {
 try { await api.postStoryToFeed(id); } catch {}
 };

 if (loading) return <MiamoLoader text="Loading stories..." />;

 return (
 <ErrorBoundary>
 <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6 relative">
 <FloatingSparkles />

 {/* Header */}
 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
 className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-main to-rose-600 flex items-center justify-center shadow-xl shadow-medium/50">
 <Sparkles className="w-6 h-6 text-text-primary" />
 </motion.div>
 <div>
 <h1 className="text-2xl font-black text-text-primary">Stories</h1>
 <p className="text-xs text-text-muted">Share moments with your matches</p>
 </div>
 </div>
 <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-rose shadow-lg shadow-soft">
 <Plus className="w-4 h-4" /> Create
 </Button>
 </div>
 </motion.div>

 {/* Story Rings — horizontal scroll */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
 className="relative z-10">
 <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
 {/* Your story */}
 <motion.button whileHover={{ scale: 1.05 }} onClick={() => ownGroup ? handleViewGroup(ownGroup) : setShowCreate(true)}
 className="flex flex-col items-center gap-2 shrink-0 group">
 <div className="relative">
 <div className={cn('rounded-full p-[3px] transition-all',
 ownGroup && ownGroup.stories.length > 0 ? 'bg-gradient-to-br from-rose-main via-rose-500 to-purple-500 shadow-lg shadow-medium/40' : 'bg-border')}>
 <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-miamo-card border-[3px] border-white flex items-center justify-center overflow-hidden">
 <Avatar name="You" size="xl" />
 </div>
 </div>
 <motion.div whileHover={{ scale: 1.2 }}
 className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-gradient-to-br from-rose to-rose- rounded-full flex items-center justify-center border-[3px] border-white shadow">
 <Plus className="w-3.5 h-3.5 text-text-primary" />
 </motion.div>
 </div>
 <span className="text-[11px] font-semibold text-text-muted w-16 text-center truncate">Your story</span>
 </motion.button>

 {/* Match stories */}
 {matchGroups.map((group: any) => {
 const author = group.user || {};
 const gPhoto = author.photos?.[0]?.url || author.photos?.[0];
 const unviewedCount = group.stories?.filter((s: any) => !s.viewed).length || 0;
 return (
 <motion.button key={author.id} whileHover={{ scale: 1.05 }} onClick={() => handleViewGroup(group)}
 className="flex flex-col items-center gap-2 shrink-0 group">
 <div className="relative">
 <div className={cn('rounded-full p-[3px] transition-all',
 !group.viewed ? 'bg-gradient-to-br from-rose-main via-rose-500 to-purple-500 shadow-lg shadow-medium/40 animate-pulse' : 'bg-border')}>
 <Avatar src={gPhoto} name={author.displayName || 'User'} size="xl" className="border-[3px] border-white" />
 </div>
 {unviewedCount > 0 && (
 <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-rose rounded-full text-[9px] font-bold text-text-primary flex items-center justify-center border-2 border-white">
 {unviewedCount}
 </span>
 )}
 </div>
 <span className="text-[11px] font-semibold text-text-muted w-16 text-center truncate group-hover:text-rose transition-colors">
 {(author.displayName || 'User').split(' ')[0]}
 </span>
 </motion.button>
 );
 })}

 {matchGroups.length === 0 && !ownGroup && (
 <div className="flex items-center gap-3 px-6 py-4 bg-miamo-surface rounded-2xl ml-2">
 <Eye className="w-5 h-5 text-text-secondary" />
 <p className="text-sm text-text-muted">No stories from your matches yet</p>
 </div>
 )}
 </div>
 </motion.div>

 {/* My Stories Insights */}
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
 <MyStoryInsights
 stories={myStories}
 onView={(idx) => { if (ownGroup) handleViewGroup(ownGroup, idx); }}
 onDelete={handleDeleteStory}
 onPostToFeed={handlePostToFeed}
 />
 </motion.div>

 {/* Story Grid — Match Stories */}
 {(matchGroups.length > 0 || viewedCount > 0) && (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10">
 <div className="flex items-center justify-between mb-3">
 <h3 className="font-bold text-text-primary flex items-center gap-2">
 <Heart className="w-4 h-4 text-rose-light" /> From Your Matches
 </h3>
 <div className="flex items-center gap-2">
 {viewedCount > 0 && (
 <button onClick={() => setHideViewed(!hideViewed)}
 className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition border',
 hideViewed ? 'bg-miamo-surface text-rose border-border' : 'bg-miamo-surface text-text-muted border-border')}>
 {hideViewed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
 {hideViewed ? `${viewedCount} viewed hidden` : 'Show all'}
 </button>
 )}
 </div>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {matchGroups.map((group: any) => {
 const author = group.user || {};
 const gPhoto = author.photos?.[0]?.url || author.photos?.[0];
 const firstStory = group.stories?.[0];
 if (!firstStory) return null;
 const { text, background } = parseStoryContent(firstStory.content || '');
 const bgGrad = getBackgroundGradient(background);
 const totalLikes = group.stories.reduce((s: number, st: any) => s + (st.likeCount || 0), 0);
 const totalComments = group.stories.reduce((s: number, st: any) => s + (st.commentCount || 0), 0);

 return (
 <motion.button key={author.id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
 onClick={() => handleViewGroup(group)}
 className="relative aspect-[9/16] max-h-[260px] rounded-2xl overflow-hidden group shadow-lg hover:shadow-xl transition-all">
 {firstStory.mediaUrl ? (
 <img loading="lazy" src={firstStory.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
 ) : (
 <div className={cn('w-full h-full bg-gradient-to-br', bgGrad)}>
 <div className="absolute inset-0 flex items-center justify-center p-3">
 <p className="text-text-primary text-xs font-bold text-center line-clamp-4 drop-shadow">{text}</p>
 </div>
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

 {/* Unviewed indicator */}
 {!group.viewed && (
 <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-r from-rose-main to-rose-500 shadow-lg animate-pulse" />
 )}

 {/* Author + story count */}
 <div className="absolute top-3 left-3 flex items-center gap-2">
 <Avatar src={gPhoto} name={author.displayName} size="xs" className="border-2 border-white/10" />
 {group.stories.length > 1 && (
 <span className="px-1.5 py-0.5 rounded-md bg-miamo-card/20 backdrop-blur text-[9px] font-bold text-text-primary">
 {group.stories.length}
 </span>
 )}
 </div>

 {/* Bottom info */}
 <div className="absolute bottom-3 inset-x-3">
 <p className="text-xs font-bold text-text-primary drop-shadow truncate">{author.displayName || 'User'}</p>
 <div className="flex items-center gap-2 mt-1">
 {totalLikes > 0 && (
 <span className="flex items-center gap-0.5 text-[9px] text-text-primary/70 font-medium">
 <Heart className="w-2.5 h-2.5" /> {totalLikes}
 </span>
 )}
 {totalComments > 0 && (
 <span className="flex items-center gap-0.5 text-[9px] text-text-primary/70 font-medium">
 <MessageCircle className="w-2.5 h-2.5" /> {totalComments}
 </span>
 )}
 <span className="text-[9px] text-text-primary/50 ml-auto">
 {new Date(firstStory.createdAt).toLocaleString([], { month: 'short', day: 'numeric' })}
 </span>
 </div>
 </div>
 </motion.button>
 );
 })}
 </div>
 </motion.div>
 )}

 {/* Empty state */}
 {matchGroups.length === 0 && myStories.length === 0 && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
 className="text-center py-16 px-6">
 <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
 className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-main/15 to-rose-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-soft/50">
 <Sparkles className="w-10 h-10 text-rose-light" />
 </motion.div>
 <h3 className="text-lg font-black text-text-primary mb-1">No Stories Yet</h3>
 <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">Share a moment with your matches! Stories are visible only to people you&apos;ve matched with.</p>
 <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-rose">
 <Plus className="w-4 h-4" /> Create Your First Story
 </Button>
 </motion.div>
 )}

 {/* Tips Card */}
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
 <Card className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/30">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
 <Sparkles className="w-4 h-4 text-indigo-500" />
 </div>
 <div>
 <h4 className="font-bold text-sm text-text-primary">Story Tips</h4>
 <ul className="text-xs text-text-muted mt-1 space-y-1">
 <li className="flex items-start gap-1.5"><span className="text-rose-light mt-0.5">&#9829;</span> Viewed stories auto-hide — toggle to see them again</li>
 <li className="flex items-start gap-1.5"><span className="text-rose-light mt-0.5">&#9829;</span> Stories expire after 7 days, even if unviewed</li>
 <li className="flex items-start gap-1.5"><span className="text-rose-light mt-0.5">&#9829;</span> Only matched users can comment on your stories</li>
 </ul>
 </div>
 </div>
 </Card>
 </motion.div>

 {/* Create Modal */}
 <AnimatePresence>
 {showCreate && <StoryCreateModal onClose={() => setShowCreate(false)} onCreated={loadStories} />}
 </AnimatePresence>

 {/* Viewer */}
 <AnimatePresence>
 {viewingGroup && (
 <StoryViewer
 storyGroup={viewingGroup}
 initialIndex={viewingIndex}
 onClose={() => { setViewingGroup(null); loadStories(); }}
 onRefresh={loadStories}
 />
 )}
 </AnimatePresence>
 </div>
 </ErrorBoundary>
 );
}
