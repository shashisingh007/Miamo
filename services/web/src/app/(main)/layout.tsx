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
import { Bell, LogOut, Crown, Sparkles } from 'lucide-react';
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
        if (err?.statusCode === 401 || err?.statusCode === 404) {
          clearAuth();
          router.push('/login');
        }
      });
      api.getNotificationCount().then(res => {
        setNotifCount(res.data?.count || res.count || 0);
      }).catch(() => {});
      api.getChats().then(res => {
        const chats = res.data || [];
        const totalUnread = chats.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        setUnreadMsgCount(totalUnread);
      }).catch(() => {});
    }
  }, [isAuthenticated, clearAuth, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      api.getNotificationCount().then(res => {
        const newCount = res.data?.count || res.count || 0;
        if (newCount > notifCount && notifCount > 0) {
          if (!pathname.startsWith('/messages')) {
            setMsgToast({ name: 'New notification', content: `You have ${newCount} unread notifications` });
            setTimeout(() => setMsgToast(null), 4000);
          }
        }
        setNotifCount(newCount);
      }).catch(() => {});
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/50 group-hover:border-amber-300 transition-all group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]">
                <Crown className="w-4 h-4 text-amber-600 group-hover:text-amber-500 transition-colors" />
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
          <Link href="/profile" className="flex items-center gap-3 group p-2 rounded-xl hover:bg-pink-50/50 transition-all">
            <div className="relative">
              <Avatar name={displayUser.displayName || 'User'} size="sm" online />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-400 border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate group-hover:text-lavender-500 transition-colors">
                {displayUser.displayName || 'Your Profile'}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">@{displayUser.username || 'user'}</p>
            </div>
            <ScoreRing score={profileScore} size={34} strokeWidth={2.5} />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-gray-400 hover:text-red-500 hover:bg-red-50/60 transition-all font-medium">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Premium Header — always visible */}
        <header className="h-[72px] header-premium flex items-center px-6 gap-4 shrink-0 relative z-20"
          style={{ borderBottom: '3px solid red' }}>
          <div className="lg:hidden flex items-center gap-2">
            <MiamoCompactIcon size={28} />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800 capitalize tracking-tight">
              {pathname === '/' ? 'Home' : pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ')}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100/50">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Elite</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/notifications" className="relative group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 border border-pink-100/40 backdrop-blur-sm group-hover:bg-white/80 group-hover:border-pink-200/60 transition-all group-hover:shadow-[0_4px_12px_rgba(236,64,122,0.08)]">
                <Bell className="w-[18px] h-[18px] text-gray-500 group-hover:text-pink-500 transition-colors" />
              </div>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-[0_2px_8px_rgba(236,64,122,0.4)] border-2 border-white">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <div className="lg:hidden">
              <Avatar name={displayUser.displayName || 'User'} size="sm" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {pathname.startsWith('/messages') ? children : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile Nav — Glass Premium */}
        <nav className="lg:hidden border-t border-pink-100/30 px-2 py-2 flex items-center justify-around frosted">
          {NAV_MAIN.slice(0, 5).map((item) => {
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
        </nav>
      </main>

      {/* Notification toast — Premium */}
      <AnimatePresence>
        {msgToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 frosted rounded-2xl shadow-xl p-4 max-w-xs cursor-pointer border border-pink-100/50"
            onClick={() => { setMsgToast(null); router.push('/notifications'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shrink-0 shadow-inner">
                <Bell className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{msgToast.name}</p>
                <p className="text-xs text-gray-500 truncate">{msgToast.content}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
