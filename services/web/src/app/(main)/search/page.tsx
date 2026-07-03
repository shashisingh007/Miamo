'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Shield, User, Hash, MapPin, Globe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackActivity, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/usePerformance';

export default function SearchPage() {
 const router = useRouter();
 const toast = useToast();
 const [query, setQuery] = usePersistentState<string>('search:query', '');
 const [searchType, setSearchType] = usePersistentState<'name' | 'id' | 'city'>('search:type', 'name');
 const [results, setResults] = useState<any[]>([]);
 const [searched, setSearched] = useState(false);
 const [liking, setLiking] = useState<string | null>(null);
 const debouncedQuery = useDebounce(query, 300);

 useTrackPageView('search');
 useTrackScrollDepth('search');
 const trackActivity = useTrackActivity();

 const doSearch = useCallback(async (q: string) => {
 if (!q.trim()) { setResults([]); setSearched(false); return; }
 trackActivity('search', 'query', undefined, { query: q.trim() });
 setSearched(true);
 try {
 const res = await api.search(q.trim(), searchType);
 setResults(res.data || []);
 } catch (e: any) {
 setResults([]);
 toast.error('Search failed', e?.message || 'Try again');
 }
 }, [searchType, trackActivity, toast]);

 // Trigger search when debounced query changes
 useEffect(() => { doSearch(debouncedQuery); }, [debouncedQuery, doSearch]);

 return (
 <ErrorBoundary>
 <div className="max-w-2xl mx-auto p-6 space-y-6">
 <div><h1 className="text-xl font-bold">Search</h1><p className="text-sm text-text-muted mt-0.5">Find people who&apos;ve opted in to be discoverable</p></div>
 <Card className="p-4 border-rose-main/20">
 <div className="flex items-start gap-3">
 <Shield className="w-5 h-5 text-rose-main shrink-0 mt-0.5" />
 <div><h4 className="text-sm font-semibold">Privacy-First Search</h4><p className="text-xs text-text-muted mt-1">Only users who enable search in their privacy settings appear here.</p></div>
 </div>
 </Card>
 <div className="flex gap-2">
 {[{ id: 'name' as const, label: 'Name', icon: User }, { id: 'id' as const, label: 'Miamo ID', icon: Hash }, { id: 'city' as const, label: 'City', icon: MapPin }].map(type => (
 <button key={type.id} onClick={() => setSearchType(type.id)}
 className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
 searchType === type.id ? 'bg-rose-main/15 text-rose-main border border-rose-main/30' : 'bg-miamo-elevated text-text-muted border border-transparent')}>
 <type.icon className="w-4 h-4" /> {type.label}
 </button>
 ))}
 </div>
 <div className="relative">
 <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
 <input value={query} onChange={e => setQuery(e.target.value)}
 placeholder={searchType === 'id' ? 'Enter Miamo ID' : searchType === 'city' ? 'Enter city…' : 'Search by name…'}
 className="input-premium w-full pl-12 text-base h-12" />
 </div>
 {results.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs text-text-muted">{results.length} result{results.length !== 1 ? 's' : ''}</p>
 {results.map((user: any, i: number) => (
 <motion.div key={user.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
 <Card hover className="p-4">
 <div className="flex items-center gap-3">
 <Avatar src={user.photos?.[0]?.url} name={user.displayName} size="md" verified={user.verified} />
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-semibold text-text-primary">{user.displayName}</h3>
 <p className="text-xs text-text-muted">{user.username ? `@${user.username}` : ''}{user.profile?.city ? ` • ${user.profile.city}` : ''}</p>
 </div>
 <div className="flex gap-2">
 <Button variant="secondary" size="sm" onClick={() => router.push(`/profile?id=${user.id}`)}>View Profile</Button>
 <Button variant="ghost" size="sm" onClick={async () => {
 setLiking(user.id);
 try { await api.sendLike(user.id); } catch (e) {}
 setLiking(null);
 }} disabled={liking === user.id}>
 <Heart className="w-3 h-3" /> {liking === user.id ? '…' : 'Like'}
 </Button>
 </div>
 </div>
 </Card>
 </motion.div>
 ))}
 </div>
 )}
 {searched && results.length === 0 && (
 <div className="text-center py-12"><SearchIcon className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No users found</p></div>
 )}
 {!searched && (
 <div className="text-center py-12"><Globe className="w-10 h-10 text-text-muted/20 mx-auto mb-3" /><p className="text-sm text-text-muted">Start typing to search</p></div>
 )}
 </div>
 </ErrorBoundary>
 );
}
