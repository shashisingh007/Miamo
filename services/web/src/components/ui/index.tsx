'use client';

import { cn, getInitials } from '@/lib/utils';
import { useState } from 'react';

// ─── Avatar ──────────────────────────────────────────────
interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  verified?: boolean;
  className?: string;
  ring?: boolean;
  storyRing?: boolean;
}

const sizeMap = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' };
const dotSizeMap = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' };

export function Avatar({ src, name, size = 'md', online, verified, className, ring, storyRing }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);

  return (
    <div className={cn('relative shrink-0', className)}>
      <div className={cn(
        'rounded-full overflow-hidden flex items-center justify-center',
        sizeMap[size],
        ring && 'ring-2 ring-lavender-400/40 ring-offset-2 ring-offset-miamo-bg',
        storyRing && 'ring-2 ring-gradient ring-offset-2 ring-offset-miamo-bg',
        !src || failed ? 'bg-gradient-to-br from-lavender-400/30 to-violet-deep/30' : ''
      )}>
        {src && !failed ? (
          <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span className="font-semibold text-lavender-300">{initials}</span>
        )}
      </div>
      {online && (
        <div className={cn('absolute bottom-0 right-0 rounded-full bg-emerald-400 border-2 border-miamo-bg', dotSizeMap[size])} />
      )}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-lavender-400 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const badgeVariants = {
  default: 'bg-lavender-400/10 text-lavender-400',
  success: 'bg-emerald-500/10 text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-400',
  danger: 'bg-red-500/10 text-red-400',
  info: 'bg-sky-500/10 text-sky-400',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-4', className)} />;
}

// ─── Empty State ─────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn('card-premium', hover && 'card-hover cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Profile Score Ring ──────────────────────────────────
interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({ score, size = 48, strokeWidth = 3, className }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-miamo-elevated" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#scoreGrad)" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8B89A" />
            <stop offset="100%" stopColor="#B8804A" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-xs font-bold text-text-primary">{score}</span>
    </div>
  );
}

// ─── Filter Chip ─────────────────────────────────────────
interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-lavender-400/20 text-lavender-400 border border-lavender-400/30'
          : 'bg-miamo-card text-text-muted border border-border hover:border-border-light hover:text-text-secondary'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
