'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { Avatar, Card, FilterChip } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function VideoCard({ video }: { video: any }) {
 const [liked, setLiked] = useState(video.liked || false);
 const [likeCount, setLikeCount] = useState(video.likeCount || video._count?.reactions || 0);
 const [showComments, setShowComments] = useState(false);
 const [commentText, setCommentText] = useState('');
 const [commentCount, setCommentCount] = useState(video.commentCount || video._count?.comments || 0);
 const [bookmarked, setBookmarked] = useState(false);
 const author = video.author || {};
 const photo = author.photos?.[0]?.url || author.photos?.[0];

 const toggleLike = async () => {
 try { await api.reactToVideo(video.id); setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); } catch (e) {}
 };

 const submitComment = async () => {
 if (!commentText.trim()) return;
 try { await api.commentOnVideo(video.id, commentText.trim()); setCommentText(''); setCommentCount((prev: number) => prev + 1); setShowComments(false); } catch (e) {}
 };

 const handleShare = () => {
 if (navigator.share) {
 navigator.share({ title: video.title || 'Miamo Video', url: window.location.href });
 } else {
 navigator.clipboard.writeText(window.location.href);
 }
 };

 return (
 <Card hover className="overflow-hidden group">
 <div className="relative aspect-[9/16] max-h-[320px] bg-miamo-elevated">
 {video.thumbnailUrl ? <img loading="lazy" src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" /> :
 <div className="w-full h-full bg-gradient-to-br from-rose-main/10 to-rose- /10" />}
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="w-12 h-12 bg-miamo-card/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer">
 <Play className="w-5 h-5 text-text-primary ml-0.5" fill="white" />
 </div>
 </div>
 <div className="absolute bottom-0 inset-x-0 p-3">
 <p className="text-xs text-text-primary line-clamp-2 mb-2">{video.title || video.description || ''}</p>
 <div className="flex items-center gap-2">
 <Avatar src={photo} name={author.displayName || 'User'} size="xs" verified={author.verified} />
 <span className="text-[11px] text-text-primary/90 font-medium">{author.displayName || 'User'}</span>
 </div>
 </div>
 </div>
 <div className="px-3 py-2.5 space-y-2">
 <div className="flex items-center justify-between">
 <button onClick={toggleLike} className={cn('flex items-center gap-1 text-xs', liked ? 'text-rose-main' : 'text-text-muted')}>
 <Heart className={cn('w-3.5 h-3.5', liked && 'fill-rose-main')} /> {likeCount}
 </button>
 <button onClick={() => setShowComments(!showComments)} className={cn('flex items-center gap-1 text-xs', showComments ? 'text-rose-main' : 'text-text-muted')}>
 <MessageCircle className="w-3.5 h-3.5" /> {commentCount}
 </button>
 <button onClick={() => setBookmarked(!bookmarked)} className={cn('text-xs', bookmarked ? 'text-amber-400' : 'text-text-muted')}>
 <Bookmark className={cn('w-3.5 h-3.5', bookmarked && 'fill-amber-400')} />
 </button>
 <button onClick={handleShare} className="text-text-muted"><Share2 className="w-3.5 h-3.5" /></button>
 </div>
 {showComments && (
 <div className="flex gap-1.5">
 <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()}
 placeholder="Comment…" className="input-premium flex-1 text-xs h-8" />
 <Button size="sm" onClick={submitComment} disabled={!commentText.trim()} className="h-8 text-xs px-2">Post</Button>
 </div>
 )}
 </div>
 </Card>
 );
}

export default function VideosPage() {
 const [filter, setFilter] = useState('all');
 const [videos, setVideos] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useTrackPageView('videos');
 useTrackScrollDepth('videos');
 const filters = ['All', 'For You', 'Trending', 'Music', 'Dance', 'Travel', 'Food'];

 useEffect(() => {
 setLoading(true);
 const params: Record<string, string> = {};
 if (filter !== 'all') params.category = filter;
 api.getVideos(params).then(res => setVideos(res.data || [])).catch(() => {}).finally(() => setLoading(false));
 }, [filter]);

 return (
 <ErrorBoundary>
 <div className="max-w-6xl mx-auto p-6 space-y-6">
 <div><h1 className="text-xl font-bold">Videos</h1><p className="text-sm text-text-muted mt-0.5">Short-form videos from the community</p></div>
 <div className="flex gap-2 overflow-x-auto no-scrollbar">
 {filters.map(f => (<FilterChip key={f} label={f} active={filter === f.toLowerCase()} onClick={() => setFilter(f.toLowerCase())} />))}
 </div>
 <p className="text-xs text-rose-main/70">💬 Comment on a video to express interest — if they respond, it&apos;s a match!</p>
 {loading ? (
 <MiamoLoader text="Loading videos..." />
 ) : videos.length === 0 ? (
 <div className="text-center py-12"><Play className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No videos yet</p></div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
 {videos.map((video, i) => (
 <motion.div key={video.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
 <VideoCard video={video} />
 </motion.div>
 ))}
 </div>
 )}
 </div>
 </ErrorBoundary>
 );
}
