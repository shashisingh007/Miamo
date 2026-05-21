'use client';

import { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, Zap, Users, Star } from 'lucide-react';
import { Avatar, Card } from '@/components/ui';
import { NotificationsSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';



const typeIcons: Record<string, typeof Heart> = { match: Heart, comment: MessageCircle, beat: Zap, message: MessageCircle, like: Star, story: Users, match_request: Heart };

function groupNotifications(notifications: any[]) {
 const now = new Date();
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
 const groups: { label: string; items: any[] }[] = [
 { label: 'Today', items: [] }, { label: 'This Week', items: [] }, { label: 'Earlier', items: [] },
 ];
 for (const n of notifications) {
 const d = new Date(n.createdAt || 0);
 if (d >= todayStart) groups[0].items.push(n);
 else if (d >= weekStart) groups[1].items.push(n);
 else groups[2].items.push(n);
 }
 return groups.filter(g => g.items.length > 0);
}

export default function NotificationsPage() {
 const [notifications, setNotifications] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const router = useRouter();

 useTrackPageView('notifications');
 useTrackScrollDepth('notifications');

 const typeRoutes: Record<string, string> = {
 match: '/matches', match_request: '/matches', like: '/discover',
 message: '/messages', comment: '/feed', beat: '/beats', story: '/stories',
 };

 useEffect(() => {
 api.getNotifications().then(res => {
 const filtered = (res.data || []).filter((n: any) => n.type !== 'message' && n.type !== 'media_share' && n.type !== 'media');
 setNotifications(filtered);
 }).catch(() => { setNotifications([]); }).finally(() => setLoading(false));
 }, []);

 const markAllRead = async () => {
 try { await api.markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch (e) {}
 };

 if (loading) return <NotificationsSkeleton />;

 return (
 <ErrorBoundary>
 <div className="max-w-2xl mx-auto p-6 space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-rose-main" /> Notifications</h1>
 <button onClick={markAllRead} className="text-xs text-rose-main hover:text-rose-light">Mark all read</button>
 </div>
 {notifications.length === 0 ? (
 <div className="text-center py-12"><Bell className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No notifications yet</p></div>
 ) : (
 <div className="space-y-5">
 {groupNotifications(notifications).map(group => (
 <div key={group.label}>
 <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">{group.label}</p>
 <div className="space-y-2">
 {group.items.map((n: any) => {
 const Icon = typeIcons[n.type] || Bell;
 const sender = n.sender || {};
 const photo = sender.photos?.[0]?.url || sender.photos?.[0];
 return (
 <Card key={n.id} hover className={cn('p-4 cursor-pointer', !n.read && 'border-rose-main/20 bg-rose-main/[0.02]')}
 onClick={async () => {
 if (!n.read) {
 try { await api.markNotificationRead(n.id); setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item)); } catch (e) {}
 }
 const route = typeRoutes[n.type];
 if (route) router.push(route);
 }}>
 <div className="flex items-center gap-3">
 <Avatar src={photo} name={sender.displayName || 'Miamo'} size="sm" />
 <div className="flex-1 min-w-0">
 <p className="text-sm"><span className="font-semibold text-text-primary">{sender.displayName || 'Miamo'}</span> <span className="text-text-muted">{n.body || n.title}</span></p>
 <p className="text-[11px] text-text-muted mt-0.5">{n.createdAt ? formatRelativeTime(n.createdAt) : ''}</p>
 </div>
 <Icon className={cn('w-4 h-4', !n.read ? 'text-rose-main' : 'text-text-muted')} />
 {!n.read && <div className="w-2 h-2 bg-rose-main rounded-full" />}
 </div>
 </Card>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </ErrorBoundary>
 );
}
