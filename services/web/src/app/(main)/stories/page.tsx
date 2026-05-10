'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Lock, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function StoryViewer({ story, onClose }: { story: any; onClose: () => void }) {
  const [reply, setReply] = useState('');
  const [reacted, setReacted] = useState(false);

  useEffect(() => { api.viewStory(story.id).catch(() => {}); }, [story.id]);
  const author = story.author || story.user || story._author || {};
  const photo = author.photos?.[0]?.url || author.photos?.[0];

  const handleReply = async () => {
    if (!reply.trim()) return;
    try { await api.reactToStory(story.id, reply.trim()); setReply(''); setReacted(true); setTimeout(() => setReacted(false), 2000); } catch (e) {}
  };

  const handleReaction = async (emoji: string) => {
    try { await api.reactToStory(story.id, emoji); setReacted(true); setTimeout(() => setReacted(false), 2000); } catch (e) {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="relative w-full max-w-md h-[80vh] mx-4">
        <div className="absolute top-4 inset-x-4 z-10 flex items-center gap-3">
          <Avatar src={photo} name={author.displayName || 'User'} size="sm" />
          <div><p className="text-sm font-semibold text-gray-900">{author.displayName || 'User'}</p><p className="text-[10px] text-gray-600">Story</p></div>
          <button onClick={onClose} className="ml-auto text-gray-700 hover:text-gray-900"><X className="w-6 h-6" /></button>
        </div>
        <div className="w-full h-full rounded-2xl overflow-hidden bg-miamo-elevated">
          {story.mediaUrl ? <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" /> :
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lavender-400/20 to-violet-deep/20">
              <p className="text-gray-900 text-lg px-8 text-center">{story.content || 'Story'}</p>
            </div>}
        </div>
        <div className="absolute bottom-4 inset-x-4 space-y-2">
          {reacted && <p className="text-xs text-emerald-400 text-center">Reaction sent!</p>}
          <div className="flex gap-2 justify-center mb-2">
            {['❤️', '🔥', '😍', '😂', '👏', '💯'].map(emoji => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className="text-lg hover:scale-125 transition-transform">{emoji}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()}
              placeholder="Reply to story…" className="input-premium flex-1 text-sm bg-black/50 border-pink-200 text-gray-900 placeholder:text-gray-400" />
            <Button size="sm" onClick={handleReply} disabled={!reply.trim()}>Send</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStory, setViewingStory] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [creating, setCreating] = useState(false);

  const loadStories = () => {
    setLoading(true);
    api.getStories().then(res => setStories(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadStories(); }, []);

  const handleCreateStory = async () => {
    if (!newStoryContent.trim()) return;
    setCreating(true);
    try {
      await api.createStory({ content: newStoryContent.trim(), type: 'text' });
      setNewStoryContent('');
      setShowCreate(false);
      loadStories();
    } catch (e) {}
    setCreating(false);
  };

  const handleDeleteStory = async (id: string) => {
    try { await api.deleteStory(id); loadStories(); } catch (e) {}
  };

  if (loading) return <MiamoLoader text="Loading stories..." />;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stories</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4" /> Create Story</Button>
      </div>

      {showCreate && (
        <Card className="p-4 border-lavender-400/20">
          <h3 className="text-sm font-semibold mb-2">Create a Story</h3>
          <textarea value={newStoryContent} onChange={e => setNewStoryContent(e.target.value)} placeholder="Share what's on your mind…"
            className="input-premium w-full text-sm resize-none" rows={3} />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCreateStory} disabled={creating || !newStoryContent.trim()}>{creating ? 'Posting…' : 'Share Story'}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Story rings */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        <button className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <div className="rounded-full bg-miamo-elevated p-[3px]"><Avatar name="You" size="xl" className="border-[3px] border-miamo-bg" /></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-lavender-400 rounded-full flex items-center justify-center border-2 border-miamo-bg"><Plus className="w-3 h-3 text-gray-900" /></div>
          </div>
          <span className="text-xs text-text-secondary">Your story</span>
        </button>
        {stories.map((storyGroup: any) => {
          const author = storyGroup.user || storyGroup.author || {};
          const photo = author.photos?.[0]?.url || author.photos?.[0];
          const firstStory = storyGroup.stories?.[0] || storyGroup;
          return (
            <button key={firstStory.id || storyGroup.id || author.id} onClick={() => setViewingStory({ ...firstStory, _author: author })} className="flex flex-col items-center gap-2 shrink-0 group">
              <div className={cn('rounded-full p-[3px] transition-transform group-hover:scale-105',
                storyGroup.viewed ? 'bg-miamo-elevated' : 'bg-gradient-to-br from-lavender-400 to-violet-deep')}>
                <Avatar src={photo} name={author.displayName || 'User'} size="xl" className="border-[3px] border-miamo-bg" />
              </div>
              <span className="text-xs text-text-secondary w-16 truncate text-center">{(author.displayName || 'User').split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-lavender-400" /> Story Privacy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2 bg-miamo-elevated/50 rounded-lg p-2.5"><Users className="w-3.5 h-3.5 text-lavender-400" /> All matches</div>
          <div className="flex items-center gap-2 bg-miamo-elevated/50 rounded-lg p-2.5"><Lock className="w-3.5 h-3.5 text-amber-400" /> Close circle only</div>
          <div className="flex items-center gap-2 bg-miamo-elevated/50 rounded-lg p-2.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> Custom expiry</div>
        </div>
        <p className="text-[11px] text-text-muted mt-2">Stories disappear after 24 hours by default.</p>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Stories</h3>
        {stories.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm text-text-muted">No stories yet</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {stories.map((storyGroup: any) => {
              const author = storyGroup.user || storyGroup.author || {};
              const photo = author.photos?.[0]?.url || author.photos?.[0];
              const firstStory = storyGroup.stories?.[0] || storyGroup;
              return (
                <button key={firstStory.id || storyGroup.id || author.id} onClick={() => setViewingStory({ ...firstStory, _author: author })}
                  className="relative aspect-[9/16] max-h-[240px] rounded-xl overflow-hidden bg-miamo-elevated group">
                  {firstStory.mediaUrl ? <img src={firstStory.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> :
                    <div className="w-full h-full bg-gradient-to-br from-lavender-400/20 to-violet-deep/20" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Avatar src={photo} name={author.displayName || 'User'} size="xs" />
                    <span className="text-xs text-gray-900 font-medium">{(author.displayName || 'User').split(' ')[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewingStory && <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />}
      </AnimatePresence>
    </div>
  );
}
