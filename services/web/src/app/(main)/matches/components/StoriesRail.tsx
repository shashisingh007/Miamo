'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { StoryCreateModal } from '@/app/(main)/stories/components/StoryCreateModal';
import { StoryViewer } from '@/app/(main)/stories/components/StoryViewer';
import { parseStoryContent, getViewedOnceSet } from '@/app/(main)/stories/components/constants';

function filterStories(group: any, currentUserId?: string, viewedOnce?: Set<string>) {
 const isOwn = group.isOwn;
 const stories = (group.stories || []).filter((s: any) => {
 const { meta } = parseStoryContent(s.content || '');
 if (!isOwn) {
 if (meta?.viewOnce && viewedOnce?.has(s.id)) return false;
 if (meta?.targetUserId && currentUserId && meta.targetUserId !== currentUserId) return false;
 if (meta?.closeCircleIds && meta.closeCircleIds.length > 0 && currentUserId && !meta.closeCircleIds.includes(currentUserId)) return false;
 }
 return true;
 });
 return { ...group, stories };
}

export function StoriesRail() {
 const { user } = useAuthStore();
 const [groups, setGroups] = useState<any[]>([]);
 const [showCreate, setShowCreate] = useState(false);
 const [viewing, setViewing] = useState<any>(null);

 const load = useCallback(() => {
 api.getStories().then(r => setGroups(r.data || [])).catch(() => setGroups([]));
 }, []);
 useEffect(() => { load(); }, [load]);

 const viewedOnce = useMemo(() => getViewedOnceSet(), [groups, viewing]);

 const ownGroup = useMemo(() => {
 const g = groups.find((x: any) => x.isOwn);
 return g ? filterStories(g, user?.id, viewedOnce) : null;
 }, [groups, user?.id, viewedOnce]);

 const matchGroups = useMemo(() => {
 return groups
 .filter((g: any) => !g.isOwn)
 .map((g: any) => filterStories(g, user?.id, viewedOnce))
 .filter((g: any) => g.stories.length > 0)
 .sort((a: any, b: any) => (a.viewed ? 1 : 0) - (b.viewed ? 1 : 0));
 }, [groups, user?.id, viewedOnce]);

 const hasOwn = !!ownGroup && ownGroup.stories.length > 0;
 const ownPhoto = (user as any)?.photos?.[0]?.url || (user as any)?.photos?.[0];
 const ownName = (user as any)?.displayName || 'You';

 return (
 <>
 <div className="mb-5 -mx-1">
 <div className="flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
 {/* Your story */}
 <div
 role="button"
 tabIndex={0}
 onClick={() => hasOwn ? setViewing(ownGroup) : setShowCreate(true)}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hasOwn ? setViewing(ownGroup) : setShowCreate(true); } }}
 className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
 >
 <div className={cn(
 'relative w-[68px] h-[68px] rounded-full p-[2.5px]',
 hasOwn ? 'bg-gradient-to-br from-rose-alt via-rose-main to-rose-main shadow-[0_4px_12px_rgba(201,120,86,0.25)]' : 'bg-border'
 )}>
 <div className="w-full h-full rounded-full bg-white p-[2px]">
 <div className="w-full h-full rounded-full overflow-hidden">
 <Avatar src={ownPhoto} name={ownName} size="md" className="w-full h-full" />
 </div>
 </div>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
 className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-rose border-2 border-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
 aria-label="Add story"
 >
 <Plus className="w-3.5 h-3.5 text-white" />
 </button>
 </div>
 <span className="text-[10px] font-semibold text-text-secondary truncate max-w-[72px]">Your story</span>
 </div>

 {/* Match stories */}
 {matchGroups.map((g: any) => {
 const u = g.user || {};
 const photo = u.photos?.[0]?.url || u.photos?.[0];
 const name = u.displayName || 'User';
 const allViewed = g.viewed;
 return (
 <button
 key={u.id || name}
 onClick={() => setViewing(g)}
 className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
 >
 <div className={cn(
 'w-[68px] h-[68px] rounded-full p-[2.5px] transition-transform group-hover:scale-105',
 allViewed
 ? 'bg-border'
 : 'bg-gradient-to-br from-rose-alt via-rose-main to-rose-main shadow-[0_4px_12px_rgba(201,120,86,0.25)]'
 )}>
 <div className="w-full h-full rounded-full bg-white p-[2px]">
 <div className="w-full h-full rounded-full overflow-hidden">
 <Avatar src={photo} name={name} size="md" className="w-full h-full" />
 </div>
 </div>
 </div>
 <span className="text-[10px] font-semibold text-text-secondary truncate max-w-[72px]">{name.split(' ')[0]}</span>
 </button>
 );
 })}

 {matchGroups.length === 0 && !hasOwn && (
 <div className="flex items-center text-[11px] text-text-muted px-2">
 No stories yet — share a moment with your matches.
 </div>
 )}
 </div>
 </div>

 <AnimatePresence>
 {showCreate && (
 <StoryCreateModal onClose={() => setShowCreate(false)} onCreated={load} />
 )}
 {viewing && (
 <StoryViewer
 storyGroup={viewing}
 onClose={() => { setViewing(null); load(); }}
 onRefresh={load}
 />
 )}
 </AnimatePresence>
 </>
 );
}
