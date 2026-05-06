'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { NAV_MAIN, NAV_SECONDARY, APP_NAME } from '@/lib/constants';
import { useAuthStore } from '@/stores';
import { Avatar, ScoreRing } from '@/components/ui';
import { api } from '@/lib/api';
import { AnimatedMiamoLogo, MiamoCompactIcon } from '@/components/ui/miamo-logo';
import { Bell, LogOut, Crown, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [msgToast, setMsgToast] = useState<{ name: string; content: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.getMe().then(res => {
        if (res.data) setProfile(res.data);
      }).catch((err) => {
        // Session invalid (user deleted after reseed, expired token, etc.)
        if (err?.statusCode === 401 || err?.statusCode === 404) {
          clearAuth();
          router.push('/login');
        }
      });
      api.getNotificationCount().then(res => {
        setNotifCount(res.data?.count || res.count || 0);
      }).catch(() => {});
      // Fetch unread message count from chats
      api.getChats().then(res => {
        const chats = res.data || [];
        const totalUnread = chats.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        setUnreadMsgCount(totalUnread);
      }).catch(() => {});
    }
  }, [isAuthenticated, clearAuth, router]);

  // Poll notifications every 8 seconds for real-time counts + message popups
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      api.getNotificationCount().then(res => {
        const newCount = res.data?.count || res.count || 0;
        if (newCount > notifCount && notifCount > 0) {
          // Show toast for new notification (only if not on messages page)
          if (!pathname.startsWith('/messages')) {
            setMsgToast({ name: 'New notification', content: `You have ${newCount} unread notifications` });
            setTimeout(() => setMsgToast(null), 4000);
          }
        }
        setNotifCount(newCount);
      }).catch(() => {});
      // Poll unread messages
      api.getChats().then(res => {
        const chats = res.data || [];
        const totalUnread = chats.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        setUnreadMsgCount(totalUnread);
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, notifCount, pathname]);

  const handleLogout = async () => {
    try { await api.logout(); } catch (e) {}
    clearAuth();
    router.push('/login');
  };

  const displayUser = profile?.user || user || { displayName: 'User', username: 'user' };
  const profileScore = profile?.user?.profile?.profileScore || profile?.profile?.profileScore || 70;

  if (!mounted) {
    return <div className="flex h-screen overflow-hidden bg-miamo-bg">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-miamo-bg">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-border bg-miamo-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border/50">
          <AnimatedMiamoLogo size={32} showWordmark={true} variant="sidebar" />
          <div className="ml-auto">
            <Link href="/premium" className="text-lavender-400 hover:text-lavender-300 transition-colors">
              <Crown className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted/60 mb-2 block">Main</span>
          {NAV_MAIN.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const isMessages = item.href === '/messages';
            return (
              <Link key={item.href} href={item.href} className={cn('nav-item', isActive && 'nav-item-active')}>
                <div className="relative">
                  <Icon className="w-[18px] h-[18px]" />
                  {isMessages && unreadMsgCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-lavender-400 rounded-full text-[9px] font-bold text-gray-900 flex items-center justify-center px-0.5">
                      {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}

          <div className="h-px bg-border my-3" />
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted/60 mb-2 block">More</span>
          {NAV_SECONDARY.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn('nav-item', isActive && 'nav-item-active')}>
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/50 p-4 space-y-3">
          <Link href="/profile" className="flex items-center gap-3 group">
            <Avatar name={displayUser.displayName || 'User'} size="sm" online />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate group-hover:text-lavender-400 transition-colors">
                {displayUser.displayName || 'Your Profile'}
              </p>
              <p className="text-xs text-text-muted">@{displayUser.username || 'user'}</p>
            </div>
            <ScoreRing score={profileScore} size={32} strokeWidth={2.5} />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border/50 bg-miamo-surface/30 backdrop-blur-md flex items-center px-6 gap-4 shrink-0">
          <div className="lg:hidden flex items-center gap-2">
            <MiamoCompactIcon size={28} />
          </div>
          <h1 className="text-lg font-semibold text-text-primary capitalize">
            {pathname === '/' ? 'Home' : pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ')}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/notifications" className="relative btn-ghost p-2 rounded-xl">
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-lavender-400 rounded-full text-[10px] font-bold text-gray-900 flex items-center justify-center px-1 border-2 border-miamo-surface">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <div className="lg:hidden">
              <Avatar name={displayUser.displayName || 'User'} size="sm" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav className="lg:hidden border-t border-border bg-miamo-surface/80 backdrop-blur-md px-2 py-2 flex items-center justify-around">
          {NAV_MAIN.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const isMessages = item.href === '/messages';
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all', isActive ? 'text-lavender-400' : 'text-text-muted')}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isMessages && unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-lavender-400 rounded-full text-[9px] font-bold text-gray-900 flex items-center justify-center px-0.5">
                      {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>

      {/* Real-time notification toast popup */}
      <AnimatePresence>
        {msgToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-miamo-card border border-lavender-400/30 rounded-xl shadow-xl p-4 max-w-xs cursor-pointer"
            onClick={() => { setMsgToast(null); router.push('/notifications'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lavender-400/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-lavender-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{msgToast.name}</p>
                <p className="text-xs text-text-muted truncate">{msgToast.content}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
