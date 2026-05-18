'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { NAV_MAIN, NAV_SECONDARY } from '@/lib/constants';
import { useAuthStore } from '@/stores';
import { Avatar, ScoreRing } from '@/components/ui';
import { api } from '@/lib/api';
import { AnimatedMiamoLogo, MiamoCompactIcon } from '@/components/ui/miamo-logo';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Bell, LogOut, Crown, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSE, useSSEConnection } from '@/hooks/useSSE';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [msgToast, setMsgToast] = useState<{ name: string; content: string } | null>(null);

  // Wait for Zustand persist to hydrate from localStorage before deciding auth state
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (process.env.NODE_ENV === 'development') console.log('[Auth] Zustand persist hydrated');
      setHydrated(true);
    });
    // If already hydrated (e.g. client-side navigation), set immediately
    if (useAuthStore.persist.hasHydrated()) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth] Already hydrated');
      setHydrated(true);
    }
    // Fallback: also check localStorage directly (in case persist is sluggish)
    if (typeof window !== 'undefined' && localStorage.getItem('miamo_token')) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth] Token found in localStorage, marking hydrated');
      setHydrated(true);
    }
    return () => unsub();
  }, []);

  // ═══ SSE Connection ═══════════════════════════════
  useSSEConnection(isAuthenticated);

  // Real-time notification count via SSE
  useSSE('new-notification', (data) => {
    const newCount = data.unreadCount ?? (notifCount + 1);
    if (newCount > notifCount && !pathname.startsWith('/messages')) {
      const title = data.notification?.title || 'New notification';
      setMsgToast({ name: title, content: `You have ${newCount} unread notifications` });
      setTimeout(() => setMsgToast(null), 4000);
    }
    setNotifCount(newCount);
  }, isAuthenticated);

  // Real-time unread message count via SSE
  const refreshUnread = useCallback(() => {
    api.getChats().then(res => {
      const chats = res.data || [];
      const totalUnread = chats.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setUnreadMsgCount(totalUnread);
    }).catch(() => { /* non-critical: silently retry on next poll */ });
  }, []);

  useSSE('new-message', refreshUnread, isAuthenticated);

  // Initial data fetch on auth
  useEffect(() => {
    if (isAuthenticated) {
      api.getMe().then(res => {
        if (res.data) setProfile(res.data);
      }).catch((err) => {
        if (err?.statusCode === 401 || err?.statusCode === 404) {
          clearAuth();
          window.location.href = '/login';
        }
      });
      api.getNotificationCount().then(res => {
        setNotifCount(res.data?.count ?? 0);
      }).catch(() => {});
      refreshUnread();
    }
  }, [isAuthenticated, clearAuth, refreshUnread]);

  // Slow fallback poll every 60s (SSE handles real-time)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      api.getNotificationCount().then(res => {
        setNotifCount(res.data?.count ?? 0);
      }).catch(() => { /* non-critical poll */ });
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshUnread]);

  const handleLogout = async () => {
    try { await api.logout(); } catch (e) {}
    clearAuth();
    window.location.href = '/login';
  };

  // Auth guard — redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      if (process.env.NODE_ENV === 'development') console.log('[Auth Guard] Redirecting to login');
      window.location.href = '/login';
    }
  }, [hydrated, isAuthenticated]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-miamo-bg">
        <div className="text-center">
          <AnimatedMiamoLogo animated={false} />
          <p className="text-text-muted mt-4 text-sm">{hydrated ? 'Redirecting to login...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const displayUser = profile?.user || user || { displayName: 'User', username: 'user' };
  const profileScore = profile?.user?.profile?.profileScore || profile?.profile?.profileScore || 70;

  return (
    <div className="flex h-screen overflow-hidden bg-miamo-bg relative">
      {/* Ambient gradient orbs */}
      <div className="orb-pink w-[300px] h-[300px] top-[-50px] right-[20%] opacity-50" />
      <div className="orb-gold w-[200px] h-[200px] bottom-[10%] left-[30%] opacity-40" />
      <div className="orb-pink w-[250px] h-[250px] bottom-[-80px] right-[5%] opacity-30" />

      {/* Subtle floating hearts */}
      <div className="floating-hearts">
        <span className="heart">💕</span>
        <span className="heart">✨</span>
        <span className="heart">💖</span>
        <span className="heart">💕</span>
        <span className="heart">✨</span>
        <span className="heart">💗</span>
        <span className="heart">💕</span>
        <span className="heart">✨</span>
      </div>

      {/* ═══ PREMIUM SIDEBAR ═══ */}
      <aside className="hidden lg:flex flex-col w-[270px] glass-sidebar relative z-10">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 h-[72px] relative">
          <div className="relative">
            <AnimatedMiamoLogo size={34} showWordmark={false} variant="sidebar" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-400/20 to-rose-400/20 blur-sm -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-romantic tracking-tight">Miamo</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-lavender-400/70">Premium</span>
          </div>
          <div className="ml-auto">
            <Link href="/premium" className="relative group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-800/50 border border-amber-200/50 dark:border-amber-700/50 group-hover:border-amber-300 transition-all group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-premium mx-4" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5 no-scrollbar">
          <span className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-lavender-400/50 mb-3 block">
            Main
          </span>
          {NAV_MAIN.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const isMessages = item.href === '/messages';
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'nav-item',
                    isActive && 'nav-item-active'
                  )}
                >
                  <div className="relative">
                    <Icon className="w-[18px] h-[18px]" />
                    {isMessages && unreadMsgCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full text-[8px] font-bold flex items-center justify-center px-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-[0_2px_8px_rgba(236,64,122,0.4)]">
                        {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-[0_0_6px_rgba(236,64,122,0.5)]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          <div className="divider-premium my-4 mx-2" />
          <span className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-lavender-400/50 mb-3 block">
            More
          </span>
          {NAV_SECONDARY.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn('nav-item', isActive && 'nav-item-active')}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="text-[13px] font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-dot-2"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="p-4 space-y-3 relative">
          <div className="divider-premium mb-3" />
          <Link href="/profile" className="flex items-center gap-3 group p-2 rounded-xl hover:bg-pink-50/50 dark:hover:bg-pink-950/30 transition-all">
            <div className="relative">
              <Avatar name={displayUser.displayName || 'User'} size="sm" online />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-400 border-2 border-white dark:border-gray-900 shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-lavender-500 transition-colors">
                {displayUser.displayName || 'Your Profile'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">@{displayUser.username || 'user'}</p>
            </div>
            <ScoreRing score={profileScore} size={34} strokeWidth={2.5} />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/40 transition-all font-medium">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10" style={{ overflow: 'clip' }}>
        {/* Premium Header */}
        <header
          className="header-premium flex items-center px-6 gap-4 overflow-hidden shrink-0"
          style={{ height: '72px' }}
        >
          <div className="lg:hidden flex items-center gap-2">
            <MiamoCompactIcon size={28} />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize tracking-tight">
              {pathname === '/' ? 'Home' : pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ')}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border border-pink-100/50 dark:border-pink-800/50">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-wider">Elite</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/notifications" className="relative group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-800/60 border border-pink-100/40 dark:border-pink-900/40 backdrop-blur-sm group-hover:bg-white/80 dark:group-hover:bg-gray-700/80 group-hover:border-pink-200/60 transition-all group-hover:shadow-[0_4px_12px_rgba(236,64,122,0.08)]">
                <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400 group-hover:text-pink-500 transition-colors" />
              </div>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-[0_2px_8px_rgba(236,64,122,0.4)] border-2 border-white dark:border-gray-900">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <div className="lg:hidden">
              <Avatar name={displayUser.displayName || 'User'} size="sm" />
            </div>
          </div>
        </header>

        {/* Page content — fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {pathname.startsWith('/messages') || pathname.startsWith('/beats') || pathname.startsWith('/creativity') || pathname.startsWith('/videos') ? children : (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  className="flex flex-col"
                  style={{ minHeight: '100%' }}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile Nav — Glass Premium */}
        <nav className="lg:hidden shrink-0 border-t border-pink-100/30 dark:border-pink-900/30 px-2 py-2 flex items-center justify-around frosted">
          {NAV_MAIN.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const isMessages = item.href === '/messages';
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all', isActive ? 'text-lavender-500' : 'text-gray-400')}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isMessages && unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                      {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && <div className="w-4 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 mt-0.5" />}
              </Link>
            );
          })}
          {/* More menu item for remaining nav items */}
          <Link href="/profile" className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all', ['/profile', '/creativity', '/stories', '/serious-mode', '/settings', '/notifications'].some(p => pathname.startsWith(p)) ? 'text-lavender-500' : 'text-gray-400')}>
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-[5px] h-[5px] rounded-sm bg-current" />
                <div className="w-[5px] h-[5px] rounded-sm bg-current" />
                <div className="w-[5px] h-[5px] rounded-sm bg-current" />
                <div className="w-[5px] h-[5px] rounded-sm bg-current" />
              </div>
            </div>
            <span className="text-[10px] font-medium">More</span>
          </Link>
        </nav>
      </main>

      {/* Notification toast — Premium */}
      <AnimatePresence>
        {msgToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 frosted rounded-2xl shadow-xl p-4 max-w-xs cursor-pointer border border-pink-100/50 dark:border-pink-900/50"
            onClick={() => { setMsgToast(null); router.push('/notifications'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 flex items-center justify-center shrink-0 shadow-inner">
                <Bell className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{msgToast.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msgToast.content}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
