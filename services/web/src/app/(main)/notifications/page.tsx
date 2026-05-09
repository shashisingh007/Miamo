'use client';

import { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, Zap, Users, Star } from 'lucide-react';
import { Avatar, Badge, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';

/* ─── Mock Notifications ─────────────────────────────── */
const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'match', title: 'New Match!', body: 'You matched with Sofia Rivera!', read: false, createdAt: new Date(Date.now() - 1800000).toISOString(), fromUser: { id: 'u1', displayName: 'Sofia Rivera', photos: [{ url: 'https://i.pravatar.cc/150?img=32' }] } },
  { id: 'n2', type: 'like', title: 'Someone likes you', body: 'Emma Chen liked your profile', read: false, createdAt: new Date(Date.now() - 3600000).toISOString(), fromUser: { id: 'u2', displayName: 'Emma Chen', photos: [{ url: 'https://i.pravatar.cc/150?img=25' }] } },
  { id: 'n3', type: 'beat', title: 'Beat received!', body: 'Aisha Patel sent you a daily beat', read: false, createdAt: new Date(Date.now() - 7200000).toISOString(), fromUser: { id: 'u3', displayName: 'Aisha Patel', photos: [{ url: 'https://i.pravatar.cc/150?img=23' }] } },
  { id: 'n4', type: 'comment', title: 'New comment', body: 'Luna Martinez commented on your post', read: true, createdAt: new Date(Date.now() - 14400000).toISOString(), fromUser: { id: 'u4', displayName: 'Luna Martinez', photos: [{ url: 'https://i.pravatar.cc/150?img=44' }] } },
  { id: 'n5', type: 'match_request', title: 'Match request', body: 'Zara Kim wants to match with you', read: true, createdAt: new Date(Date.now() - 28800000).toISOString(), fromUser: { id: 'u5', displayName: 'Zara Kim', photos: [{ url: 'https://i.pravatar.cc/150?img=45' }] } },
  { id: 'n6', type: 'like', title: 'Profile liked', body: 'Mia Johnson liked your photo', read: true, createdAt: new Date(Date.now() - 43200000).toISOString(), fromUser: { id: 'u6', displayName: 'Mia Johnson', photos: [{ url: 'https://i.pravatar.cc/150?img=47' }] } },
];

const typeIcons: Record<string, typeof Heart> = { match: Heart, comment: MessageCircle, beat: Zap, message: MessageCircle, like: Star, story: Users, match_request: Heart };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('miamo_token') : null;
    if (!token) { setNotifications(MOCK_NOTIFICATIONS); setLoading(false); return; }
    api.getNotifications().then(res => {
      const filtered = (res.data || []).filter((n: any) => n.type !== 'message' && n.type !== 'media_share' && n.type !== 'media');
      setNotifications(filtered.length > 0 ? filtered : MOCK_NOTIFICATIONS);
    }).catch(() => { setNotifications(MOCK_NOTIFICATIONS); }).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try { await api.markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch (e) {}
  };

  if (loading) return <MiamoLoader text="Loading notifications..." />;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-lavender-400" /> Notifications</h1>
        <button onClick={markAllRead} className="text-xs text-lavender-400 hover:text-lavender-300">Mark all read</button>
      </div>
      {notifications.length === 0 ? (
        <div className="text-center py-12"><Bell className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No notifications yet</p></div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const Icon = typeIcons[n.type] || Bell;
            const sender = n.sender || {};
            const photo = sender.photos?.[0]?.url || sender.photos?.[0];
            return (
              <Card key={n.id} hover className={cn('p-4 cursor-pointer', !n.read && 'border-lavender-400/20 bg-lavender-400/[0.02]')}
                onClick={async () => {
                  if (!n.read) {
                    try { await api.markNotificationRead(n.id); setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item)); } catch (e) {}
                  }
                }}>
                <div className="flex items-center gap-3">
                  <Avatar src={photo} name={sender.displayName || 'Miamo'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-semibold text-text-primary">{sender.displayName || 'Miamo'}</span> <span className="text-text-muted">{n.body || n.title}</span></p>
                    <p className="text-[11px] text-text-muted mt-0.5">{n.createdAt ? formatRelativeTime(n.createdAt) : ''}</p>
                  </div>
                  <Icon className={cn('w-4 h-4', !n.read ? 'text-lavender-400' : 'text-text-muted')} />
                  {!n.read && <div className="w-2 h-2 bg-lavender-400 rounded-full" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
