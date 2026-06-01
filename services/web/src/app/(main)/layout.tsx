'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { NAV_MAIN, NAV_SECONDARY } from '@/lib/constants';
import { useAuthStore } from '@/stores';
import { Avatar, ScoreRing } from '@/components/ui';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { MiamoCompactIcon, MiamoWordmark, AnimatedMiamoLogo } from '@/components/ui/miamo-logo';
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
 }).catch((e) => logError('layout.getNotificationCount', e));
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

 // v3.2 — Onboarding gate. Pages exempt: profile, settings, onboarding itself,
 // notifications (so users can clear pings), and access (so users can act on inbox).
 useEffect(() => {
   if (!hydrated || !isAuthenticated) return;
   const exempt = ['/onboarding', '/profile', '/settings', '/notifications', '/access', '/serious-mode'];
   if (exempt.some(p => pathname.startsWith(p))) return;
   let cancelled = false;
   (async () => {
     try {
       const r = await api.getCompletion();
       if (cancelled) return;
       if (r?.data && r.data.score < r.data.threshold) {
         router.replace('/onboarding');
       }
     } catch {
       // fail-open — don't block on completion lookup hiccups
     }
   })();
   return () => { cancelled = true; };
 }, [hydrated, isAuthenticated, pathname, router]);

 if (!hydrated || !isAuthenticated) {
 return (
 <div className="flex h-screen items-center justify-center bg-miamo-bg">
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
 <AnimatedMiamoLogo animated={true} />
 <motion.p
 className="text-text-muted text-[13px]"
 animate={{ opacity: [0.4, 0.85, 0.4] }}
 transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
 >
 {hydrated ? 'Redirecting to login…' : 'Loading…'}
 </motion.p>
 </motion.div>
 </div>
 );
 }

 const displayUser = profile?.user || user || { displayName: 'User', username: 'user' };
 const profileScore = profile?.user?.profile?.profileScore || profile?.profile?.profileScore || 70;

 return (
 <div className="flex h-screen overflow-hidden bg-miamo-bg relative">
 {/* Single soft copper bloom — quiet, no clutter */}
 <div
 aria-hidden
 className="pointer-events-none absolute top-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-40"
 style={{ background: 'radial-gradient(circle, rgba(201,120,86,0.16) 0%, rgba(232,180,160,0.08) 40%, transparent 70%)' }}
 />
 {/* ═══ PREMIUM SIDEBAR ═══ */}
 <aside className="hidden lg:flex flex-col w-[270px] glass-sidebar relative z-10">
          {/* Brand header — wordmark and Premium badge share the same vertical centre */}
          <div className="flex items-center justify-between h-[72px] px-6">
            <div className="flex items-center miamo-sidebar-logo h-11">
              <MiamoWordmark height={20} animated={false} className="!min-h-0 !h-11 !w-[110px]" />
            </div>
            <Link href="/premium" className="group flex flex-col items-center gap-1" aria-label="Premium">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-soft border border-rose-main/25 group-hover:border-rose-main/50 group-hover:bg-rose-main/15 transition-all shadow-[0_4px_14px_rgba(232,93,117,0.18)]">
                <Crown className="w-4 h-4 text-rose group-hover:text-rose-main transition-colors" />
              </div>
              <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-rose leading-none">Premium</span>
            </Link>
          </div>

 {/* Divider */}
 <div className="divider-premium mx-4" />

 {/* Navigation */}
 <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5 no-scrollbar">
 <span className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#C97856]/60 mb-3 block">
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
 <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full text-[8px] font-bold flex items-center justify-center px-0.5 bg-gradient-to-r from-[#C97856] to-[#D4896A] text-white shadow-[0_2px_8px_rgba(201,120,86,0.35)]">
 {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
 </span>
 )}
 </div>
 <span className="text-[13px] font-medium">{item.label}</span>
 {isActive && (
 <motion.div
 layoutId="nav-active-dot"
 className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#C97856] to-[#D4896A] shadow-[0_0_8px_rgba(201,120,86,0.4)]"
 />
 )}
 </motion.div>
 </Link>
 );
 })}

 <div className="divider-premium my-4 mx-2" />
 <span className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#C97856]/60 mb-3 block">
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
 className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-rose"
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
 <Link href="/profile" className="flex items-center gap-3 group p-2 rounded-xl hover:bg-miamo-surface/50 transition-all">
 <div className="relative">
 <Avatar name={displayUser.displayName || 'User'} size="sm" online />
 <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-main border-2 border-white shadow-sm" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-rose transition-colors">
 {displayUser.displayName || 'Your Profile'}
 </p>
 <p className="text-[11px] text-text-muted font-medium">@{displayUser.username || 'user'}</p>
 </div>
 <ScoreRing score={profileScore} size={34} strokeWidth={2.5} />
 </Link>
 <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] text-text-secondary hover:text-rose hover:bg-rose-soft/40 transition-all font-medium">
 <LogOut className="w-3.5 h-3.5" /> Sign out
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
 <h1 className="font-brand font-semibold text-2xl text-text-primary capitalize tracking-tight">
 {(() => {
   if (pathname === '/') return 'Home';
   const seg = pathname.split('/').filter(Boolean)[0] || '';
   const titles: Record<string, string> = {
     'onboarding': 'My Profile',
     'serious-mode': 'Date to Marry',
     'ai-match': 'AI Match',
     'date-planner': 'Date Planner',
     'love-language': 'Love Language',
     'vibe-check': 'Vibe Check',
     'date-ideas': 'Date Ideas',
   };
   return titles[seg] ?? seg.replace(/-/g, ' ');
 })()}
 </h1>
 </div>
 <div className="ml-auto flex items-center gap-3">
 <Link href="/notifications" className="relative group">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center glass border border-[#C97856]/8 group-hover:border-[#C97856]/20 group-hover:shadow-[0_4px_16px_rgba(201,120,86,0.08)] transition-all duration-300">
 <Bell className="w-[18px] h-[18px] text-text-muted group-hover:text-[#C97856] transition-colors" />
 </div>
 {notifCount > 0 && (
 <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-[#C97856] to-[#D4896A] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-[0_2px_10px_rgba(201,120,86,0.35)] border-2 border-white animate-pulse-slow">
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
 {pathname.startsWith('/messages') || pathname.startsWith('/beats') || pathname.startsWith('/creativity') || pathname.startsWith('/videos') ? (
 children
 ) : pathname.startsWith('/serious-mode') ? (
 <div className="h-full overflow-y-auto">{children}</div>
 ) : (
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
 <nav className="lg:hidden shrink-0 border-t border-[#C97856]/8 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around frosted">
 {NAV_MAIN.slice(0, 4).map((item) => {
 const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
 const Icon = item.icon;
 const isMessages = item.href === '/messages';
 return (
 <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 min-h-[44px] min-w-[44px]', isActive ? 'text-[#C97856]' : 'text-text-muted hover:text-[#C97856]')}>
 <div className="relative">
 <Icon className="w-5 h-5" />
 {isMessages && unreadMsgCount > 0 && (
 <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-gradient-to-r from-[#C97856] to-[#D4896A] rounded-full text-[8px] font-bold text-white flex items-center justify-center px-0.5 shadow-[0_2px_6px_rgba(201,120,86,0.3)]">
 {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
 </span>
 )}
 </div>
 <span className="text-[10px] font-medium">{item.label}</span>
 {isActive && <div className="w-4 h-0.5 rounded-full bg-gradient-to-r from-[#C97856] to-[#D4896A] mt-0.5 shadow-[0_0_6px_rgba(201,120,86,0.3)]" />}
 </Link>
 );
 })}
 {/* More menu item for remaining nav items */}
 <Link href="/profile" className={cn('flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 min-h-[44px] min-w-[44px]', ['/profile', '/creativity', '/stories', '/serious-mode', '/settings', '/notifications'].some(p => pathname.startsWith(p)) ? 'text-[#C97856]' : 'text-text-muted hover:text-[#C97856]')}>
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
 className="fixed top-4 right-4 z-50 frosted rounded-2xl shadow-xl p-4 max-w-xs cursor-pointer border border-border/50"
 onClick={() => { setMsgToast(null); router.push('/notifications'); }}
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-main/15 to-rose-soft flex items-center justify-center shrink-0 shadow-inner">
 <Bell className="w-5 h-5 text-rose" />
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
