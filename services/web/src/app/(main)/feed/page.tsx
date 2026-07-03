'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Lightbulb, Image as ImageIcon, Video, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, FilterChip } from '@/components/ui';
import { FeedSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { loadImageFromFile, compressImage, compressVideo, videoNeedsCompression } from '@/lib/media-utils';



function ComposeBox({ onPost }: { onPost: () => void }) {
 const [content, setContent] = useState('');
 const [posting, setPosting] = useState(false);
 const [mediaFile, setMediaFile] = useState<{ file: File; preview: string } | null>(null);
 const { user } = useAuthStore();
 const toast = useToast();

 const handlePost = async () => {
 if (!content.trim() && !mediaFile) return;
 setPosting(true);
 try {
 let mediaUrl: string | undefined;
 if (mediaFile) {
 if (mediaFile.file.type.startsWith('image/')) {
 const img = await loadImageFromFile(mediaFile.file);
 mediaUrl = await compressImage({ img, maxDim: 1080 });
 } else if (mediaFile.file.type.startsWith('video/')) {
 if (videoNeedsCompression(mediaFile.file)) {
 const result = await compressVideo({ file: mediaFile.file });
 mediaUrl = result.dataUrl;
 } else {
 const reader = new FileReader();
 mediaUrl = await new Promise<string>((r) => { reader.onload = () => r(reader.result as string); reader.readAsDataURL(mediaFile.file); });
 }
 }
 }
 await api.createPost({ content: content.trim(), mediaUrl });
 setContent('');
 if (mediaFile?.preview) URL.revokeObjectURL(mediaFile.preview);
 setMediaFile(null);
 onPost();
 toast.success('Posted');
 } catch (e: any) {
 toast.error('Could not post', e?.message || 'Please try again');
 }
 setPosting(false);
 };

 const pickMedia = (accept: string) => {
 const inp = document.createElement('input');
 inp.type = 'file'; inp.accept = accept;
 inp.onchange = (e: any) => {
 const f = e.target.files?.[0];
 if (!f) return;
 if (mediaFile?.preview) URL.revokeObjectURL(mediaFile.preview);
 setMediaFile({ file: f, preview: URL.createObjectURL(f) });
 };
 inp.click();
 };

 return (
 <Card className="p-4">
 <div className="flex items-start gap-3">
 <Avatar name={user?.displayName || 'You'} size="sm" />
 <div className="flex-1">
 <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share a thought, idea, or date suggestion…"
 className="input-premium w-full resize-none text-sm min-h-[60px]" rows={2} />
 {mediaFile && (
 <div className="relative mt-2 inline-block">
 {mediaFile.file.type.startsWith('image/') ? (
 <img src={mediaFile.preview} alt="Attached" className="max-h-40 rounded-xl object-cover" />
 ) : (
 <video src={mediaFile.preview} className="max-h-40 rounded-xl" muted controls playsInline />
 )}
 <button onClick={() => { URL.revokeObjectURL(mediaFile.preview); setMediaFile(null); }}
 className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
 <X className="w-3 h-3 text-white" />
 </button>
 </div>
 )}
 <div className="flex items-center justify-between mt-3">
 <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" title="Attach image" onClick={() => pickMedia('image/*')}><ImageIcon className="w-4 h-4" /></Button>
 <Button variant="ghost" size="icon-sm" title="Attach video" onClick={() => pickMedia('video/*')}><Video className="w-4 h-4" /></Button>
 <Button variant="ghost" size="icon-sm" title="Date idea" onClick={() => setContent(c => c + (c ? '\n' : '') + '💡 Date idea: ')}><Lightbulb className="w-4 h-4" /></Button>
 <Button variant="ghost" size="icon-sm" title="Add emoji" onClick={() => setContent(c => c + '❤️')}><Smile className="w-4 h-4" /></Button>
 </div>
 <Button size="sm" onClick={handlePost} disabled={posting || (!content.trim() && !mediaFile)}>{posting ? 'Posting…' : 'Post'}</Button>
 </div>
 </div>
 </div>
 </Card>
 );
}

function FeedPost({ post, onDelete }: { post: any; onDelete?: () => void }) {
 const [liked, setLiked] = useState(post.liked || false);
 const [likes, setLikes] = useState(post._count?.reactions || post.likeCount || 0);
 const [showComments, setShowComments] = useState(false);
 const [comments, setComments] = useState<any[]>([]);
 const [commentText, setCommentText] = useState('');
 const [commentCount, setCommentCount] = useState(post._count?.comments || post.commentCount || 0);
 const [loadingComments, setLoadingComments] = useState(false);
 const [showMenu, setShowMenu] = useState(false);
 const [bookmarked, setBookmarked] = useState(false);
 const toast = useToast();
 const author = post.author || {};
 const photo = author.photos?.[0]?.url || author.photos?.[0];

 // click-matrix.md §5 rank 10: was rolling back silently — user sees the
 // like flicker with no explanation. Roll back AND toast on failure.
 const toggleLike = async () => {
  const wasLiked = liked;
  setLiked(!wasLiked);
  setLikes(wasLiked ? likes - 1 : likes + 1);
  try {
   await api.reactToPost(post.id);
  } catch (e: any) {
   setLiked(wasLiked);
   setLikes(wasLiked ? likes : likes - 1);
   toast.error('Could not save like', e?.message || 'Try again');
  }
 };

 const loadComments = async () => {
 setLoadingComments(true);
 try { const res = await api.getPostComments(post.id); setComments(res.data || []); }
 catch { toast.error('Could not load comments'); }
 setLoadingComments(false);
 };

 const toggleComments = () => {
 if (!showComments) loadComments();
 setShowComments(!showComments);
 };

 const submitComment = async () => {
 if (!commentText.trim()) return;
 const text = commentText.trim();
 setCommentText('');
 try {
 const res = await api.commentOnPost(post.id, text);
 if (res.data) setComments((prev: any[]) => [...prev, res.data]);
 setCommentCount((prev: number) => prev + 1);
 } catch (e: any) {
 setCommentText(text);
 toast.error('Comment failed', e?.message || 'Try again');
 }
 };

 const handleDelete = async () => {
 try { await api.deletePost(post.id); onDelete?.(); toast.success('Post deleted'); }
 catch (e: any) { toast.error('Delete failed', e?.message || 'Try again'); }
 setShowMenu(false);
 };

 const handleShare = () => {
 if (navigator.share) {
 navigator.share({ title: `${author.displayName}'s post on Miamo`, text: post.content?.slice(0, 100), url: window.location.href });
 } else {
 navigator.clipboard.writeText(window.location.href + '#post-' + post.id);
 }
 };

 return (
 <Card className="overflow-hidden">
 <div className="flex items-center gap-3 p-4 pb-0">
 <Avatar src={photo} name={author.displayName || 'User'} size="sm" verified={author.verified} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h4 className="text-sm font-semibold text-text-primary">{author.displayName || 'User'}</h4>
 {post.type && post.type !== 'text' && <Badge variant="muted">{post.type}</Badge>}
 </div>
 <p className="text-[11px] text-text-muted">{post.createdAt ? formatRelativeTime(post.createdAt) : ''}</p>
 </div>
 <div className="relative">
 <Button variant="ghost" size="icon-sm" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal className="w-4 h-4" /></Button>
 {showMenu && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
 <div className="absolute right-0 top-full mt-1 z-50 bg-miamo-card border border-border rounded-xl shadow-2xl py-1 w-40">
 <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">Delete post</button>
 <button onClick={() => { setBookmarked(!bookmarked); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-miamo-elevated transition-colors">{bookmarked ? 'Unsave' : 'Save post'}</button>
 </div>
 </>
 )}
 </div>
 </div>
 <div className="p-4">
 <p className="text-sm text-text-primary leading-relaxed">{post.content}</p>
 {post.mediaUrl && (
 <div className="mt-3 rounded-xl overflow-hidden bg-miamo-elevated aspect-video">
 <img loading="lazy" src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
 </div>
 )}
 </div>
 <div className="flex items-center gap-1 px-4 pb-3 border-t border-border/30 pt-3">
 <button onClick={toggleLike} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
 liked ? 'text-rose-main bg-rose-main/10' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-elevated')}>
 <Heart className={cn('w-4 h-4', liked && 'fill-rose-main')} /> {likes}
 </button>
 <button onClick={toggleComments} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
 showComments ? 'text-rose-main bg-rose-main/10' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-elevated')}>
 <MessageCircle className="w-4 h-4" /> {commentCount}
 </button>
 <button onClick={() => setBookmarked(!bookmarked)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
 bookmarked ? 'text-rose-alt bg-rose-alt/10' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-elevated')}>
 <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-rose-alt')} />
 </button>
 <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-miamo-elevated transition-all ml-auto">
 <Share2 className="w-4 h-4" />
 </button>
 </div>
 {showComments && (
 <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
 <div className="flex items-center gap-2">
 <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()}
 placeholder="Write a comment…" className="input-premium flex-1 text-sm h-9" />
 <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}>Post</Button>
 </div>
 {loadingComments ? (
 <div className="flex justify-center py-3"><img src="/assets/logo.svg" alt="Loading" className="w-5 h-5 rounded-lg animate-pulse" /></div>
 ) : comments.length === 0 ? (
 <p className="text-xs text-text-muted text-center py-2">No comments yet. Be the first!</p>
 ) : (
 <div className="space-y-2">
 {comments.map((c: any) => (
 <div key={c.id} className="flex items-start gap-2">
 <Avatar name={c.author?.displayName || 'User'} size="xs" />
 <div className="bg-miamo-elevated/50 rounded-xl px-3 py-2 flex-1">
 <p className="text-xs font-semibold text-text-primary">{c.author?.displayName || 'User'}</p>
 <p className="text-xs text-text-secondary mt-0.5">{c.content}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </Card>
 );
}

export default function FeedPage() {
 const [activeFilter, setActiveFilter] = usePersistentState<string>('feed:activeFilter', 'all');
 const [posts, setPosts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useTrackPageView('feed');
 useTrackScrollDepth('feed');
 const filters = [
 { label: 'All', value: 'all' },
 { label: 'Thoughts', value: 'thought' },
 { label: 'Photos', value: 'image' },
 { label: 'Date Ideas', value: 'date-idea' },
 { label: 'Moods', value: 'mood' },
 { label: 'Milestones', value: 'milestone' },
 ];

 const loadPosts = () => {
 setLoading(true);
 const params: Record<string, string> = {};
 if (activeFilter !== 'all') params.type = activeFilter;
 api.getFeed(params).then(res => {
 setPosts(res.data || []);
 }).catch(() => { setPosts([]); }).finally(() => setLoading(false));
 };

 useEffect(() => { loadPosts(); }, [activeFilter]);

 return (
 <ErrorBoundary>
 <div className="max-w-2xl mx-auto p-6 space-y-5">
 <ComposeBox onPost={loadPosts} />
 <div className="flex gap-2 overflow-x-auto no-scrollbar">
 {filters.map(f => (
 <FilterChip key={f.value} label={f.label} active={activeFilter === f.value} onClick={() => setActiveFilter(f.value)} />
 ))}
 </div>
 {loading ? (
 <FeedSkeleton />
 ) : posts.length === 0 ? (
 <div className="text-center py-12"><MessageCircle className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No posts yet. Be the first to share!</p></div>
 ) : (
 <div className="space-y-4">
 {posts.map((post, i) => (
 <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
 <FeedPost post={post} onDelete={loadPosts} />
 </motion.div>
 ))}
 </div>
 )}
 </div>
 </ErrorBoundary>
 );
}
