'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-gradient-to-r from-pink-50 via-white to-pink-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%] animate-shimmer', className)} />
  );
}

/* ─── Premium Shimmer Card ─── */
function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-pink-100/30 dark:border-pink-900/20', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-gray-700/40 to-transparent animate-[shimmer-slide_2s_ease-in-out_infinite]" />
    </div>
  );
}

/* ─── Preset Skeleton Layouts ─── */

export function ProfileCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-sm mx-auto space-y-4 p-6"
    >
      {/* Photo card */}
      <Skeleton className="w-full aspect-[3/4] rounded-3xl" />
      {/* Name + age */}
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
      {/* Interest tags */}
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      {/* Compatibility bar */}
      <Skeleton className="h-3 w-full rounded-full" />
      {/* Action buttons */}
      <div className="flex gap-4 mt-4 justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    </motion.div>
  );
}

export function ChatListSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1 p-3">
      {/* Search bar */}
      <Skeleton className="h-11 w-full rounded-xl mb-3" />
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-9 w-16 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-18 rounded-xl" />
      </div>
      {/* Chat items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export function FeedSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 p-4 max-w-lg mx-auto">
      {/* Filters */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-xl shrink-0" />
        ))}
      </div>
      {/* Posts */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-pink-100/30 dark:border-pink-900/20 p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="flex gap-6 pt-1">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-3 w-1/2 rounded-lg" />
        </div>
      ))}
    </motion.div>
  );
}

export function SettingsSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="flex lg:flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4 p-6 rounded-2xl border border-pink-100/30 dark:border-pink-900/20">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationsSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-4 max-w-lg mx-auto">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-2xl">
          <Skeleton className="w-11 h-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </motion.div>
  );
}

/* ─── NEW: PAGE-SPECIFIC PREMIUM SKELETONS ─── */

export function ProfilePageSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      {/* Hero cover */}
      <Skeleton className="w-full h-48 rounded-none" />
      {/* Avatar + name */}
      <div className="px-6 -mt-12 relative z-10 space-y-4">
        <div className="flex items-end gap-4">
          <Skeleton className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900" />
          <div className="space-y-2 flex-1 pb-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        {/* Score ring + stats */}
        <div className="flex gap-6">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex gap-8">
            {[1, 2, 3].map(i => <div key={i} className="space-y-1"><Skeleton className="h-5 w-10" /><Skeleton className="h-3 w-14" /></div>)}
          </div>
        </div>
        {/* Bio */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {/* Interest tags */}
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        {/* Photo grid */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      </div>
    </motion.div>
  );
}

export function MatchesSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      {/* Match cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function BeatsSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
      {/* Stats bar */}
      <div className="flex gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 flex-1 rounded-2xl" />
        ))}
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      {/* Beat cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-pink-100/30 dark:border-pink-900/20">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
      ))}
    </motion.div>
  );
}

export function StoriesSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-6">
      {/* Story row */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
        ))}
      </div>
    </motion.div>
  );
}

export function CreativitySkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 p-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl shrink-0" />
        ))}
      </div>
      {/* Content cards */}
      <div className="px-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-pink-100/30 overflow-hidden">
            <Skeleton className="w-full h-64" />
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
