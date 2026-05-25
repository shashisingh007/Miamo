'use client';

import React, { useState } from 'react';
import { cn, getInitials } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// AVATAR — PREMIUM WITH GRADIENT RING
// ═══════════════════════════════════════════════════════════
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

const sizeMap = {
 xs: 'w-7 h-7 text-[10px]',
 sm: 'w-9 h-9 text-xs',
 md: 'w-11 h-11 text-sm',
 lg: 'w-14 h-14 text-base',
 xl: 'w-20 h-20 text-xl',
};
const dotSizeMap = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' };

/**
 * Premium avatar component with gradient ring, online dot, and verified badge.
 *
 * Falls back to uppercase initials with a pink gradient background when
 * the image fails to load or no `src` is provided.
 *
 * @param src - URL of the avatar image (nullable)
 * @param name - User's display name (used for initials fallback)
 * @param size - Avatar size preset: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param online - Show green online indicator dot
 * @param verified - Show pink checkmark badge
 * @param ring - Show pink ring around avatar
 * @param storyRing - Show gradient story ring (pink→rose→purple)
 */
export function Avatar({ src, name, size = 'md', online, verified, className, ring, storyRing }: AvatarProps) {
 const [failed, setFailed] = useState(false);
 const initials = getInitials(name);

 return (
 <div className={cn('relative shrink-0', className)}>
 {/* Gradient ring for stories */}
 {storyRing && (
 <div className={cn('absolute inset-[-3px] rounded-full bg-gradient-to-r from-[#C97856] via-[#D4896A] to-[#B8694A]')} />
 )}
 <div className={cn(
 'rounded-full overflow-hidden flex items-center justify-center shadow-sm relative',
 sizeMap[size],
 ring && 'ring-2 ring-[#C97856]/50 ring-offset-2 ring-offset-miamo-bg',
 storyRing && 'ring-2 ring-miamo-bg ring-offset-0',
 !src || failed ? 'bg-gradient-to-br from-[#C97856]/15 to-[#D4896A]/10' : ''
 )}>
 {src && !failed ? (
 <img loading="lazy" src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
 ) : (
 <span className="font-bold text-[#C97856]">{initials}</span>
 )}
 </div>
 {online && (
 <div className={cn(
 'absolute bottom-0 right-0 rounded-full border-2 border-white shadow-sm',
 'bg-gradient-to-r from-emerald-400 to-green-400',
 dotSizeMap[size]
 )} />
 )}
 {verified && (
 <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-[#C97856] to-[#D4896A] rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(201,120,86,0.3)]">
 <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
 </div>
 )}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════
// BADGE — GLASS PREMIUM
// ═══════════════════════════════════════════════════════════
interface BadgeProps {
 children: React.ReactNode;
 variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
 className?: string;
}

const badgeVariants: Record<string, string> = {
 default: 'bg-[#C97856]/8 text-[#C97856] border-[#C97856]/15',
 success: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200/50',
 warning: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200/50',
 danger: 'bg-gradient-to-r from-red-50 to-red-100/60 text-red-700 border-red-200/50',
 info: 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-200/50',
 muted: 'bg-miamo-surface text-text-muted border-border/50',
};

/**
 * Glass-morphism badge with color variant presets.
 *
 * @param variant - Visual style: 'default' (pink) | 'success' | 'warning' | 'danger' | 'info' | 'muted'
 */
export function Badge({ children, variant = 'default', className }: BadgeProps) {
 return (
 <span className={cn(
 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
 badgeVariants[variant],
 className
 )}>
 {children}
 </span>
 );
}

// ═══════════════════════════════════════════════════════════
// SKELETON — PREMIUM SHIMMER
// ═══════════════════════════════════════════════════════════
interface SkeletonProps {
 className?: string;
}

/** Shimmer loading placeholder. Apply width/height via `className`. */
export function Skeleton({ className }: SkeletonProps) {
 return <div className={cn('skeleton h-4', className)} />;
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE — ELEGANT
// ═══════════════════════════════════════════════════════════
interface EmptyStateProps {
 icon?: React.ReactNode;
 title: string;
 description?: string;
 action?: React.ReactNode;
}

/**
 * Structured empty state with icon, title, optional description, and CTA.
 * Centered layout, suitable for full-page or section-level empty states.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
 {icon && (
 <div className="mb-5 w-16 h-16 rounded-2xl bg-[#C97856]/8 border border-[#C97856]/15 flex items-center justify-center text-[#C97856] shadow-[0_4px_12px_rgba(201,120,86,0.08)]">
 {icon}
 </div>
 )}
 <h3 className="text-lg font-bold text-text-primary mb-1.5">{title}</h3>
 {description && <p className="text-sm text-text-muted max-w-sm leading-relaxed">{description}</p>}
 {action && <div className="mt-5">{action}</div>}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════
// CARD — GLASS 3D PREMIUM
// ═══════════════════════════════════════════════════════════
interface CardProps {
 children: React.ReactNode;
 className?: string;
 hover?: boolean;
 onClick?: () => void;
}

/**
 * Premium glass-morphism card with optional hover elevation effect.
 * Uses `card-premium` and `card-hover` CSS utility classes.
 */
export function Card({ children, className, hover, onClick }: CardProps) {
 return (
 <div
 className={cn('card-premium', hover && 'card-hover', className)}
 onClick={onClick}
 >
 {children}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════
// SCORE RING — GRADIENT PREMIUM
// ═══════════════════════════════════════════════════════════
interface ScoreRingProps {
 score: number;
 size?: number;
 strokeWidth?: number;
 className?: string;
}

/**
 * Circular score visualization using an SVG gradient ring.
 * Animates from 0 to the given score with a 1-second ease-out transition.
 *
 * @param score - Score value 0–100 (displayed in center)
 * @param size - SVG diameter in pixels (default: 48)
 * @param strokeWidth - Ring thickness in pixels (default: 3)
 */
export function ScoreRing({ score, size = 48, strokeWidth = 3, className }: ScoreRingProps) {
 const gradientId = React.useId();
 const radius = (size - strokeWidth) / 2;
 const circumference = radius * 2 * Math.PI;
 const offset = circumference - (score / 100) * circumference;

 return (
 <div className={cn('relative inline-flex items-center justify-center', className)}>
 <svg width={size} height={size} className="-rotate-90">
 <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-miamo-elevated" />
 <circle cx={size / 2} cy={size / 2} r={radius} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="none"
 strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
 className="transition-all duration-1000 ease-out" />
 <defs>
 <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#C97856" />
 <stop offset="50%" stopColor="#D4896A" />
 <stop offset="100%" stopColor="#B8694A" />
 </linearGradient>
 </defs>
 </svg>
 <span className="absolute text-[10px] font-black text-text-secondary">{score}</span>
 </div>
 );
}

// ═══════════════════════════════════════════════════════════
// FILTER CHIP — GLASS MIRROR
// ═══════════════════════════════════════════════════════════
interface FilterChipProps {
 label: string;
 active?: boolean;
 onClick?: () => void;
 icon?: React.ReactNode;
}

/**
 * Glass-style filter chip / toggle button.
 * Switches between active (gradient) and inactive (glass) styles.
 *
 * @param label - Chip label text
 * @param active - Whether the chip is in the active/selected state
 * @param icon - Optional leading icon element
 */
export function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
 return (
 <button
 onClick={onClick}
 className={cn(
 'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-300',
 active
 ? 'chip-glass-active'
 : 'chip-glass text-text-secondary hover:text-[#C97856]'
 )}
 >
 {icon}
 {label}
 </button>
 );
}
