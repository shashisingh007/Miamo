import {
 Sparkles, Trophy, Headphones, Palette, Music, Laugh,
 Dumbbell, UtensilsCrossed, Camera, Plane, Shirt, Cpu,
 Mic, BookOpen, Star, Leaf, Briefcase, Clapperboard,
} from 'lucide-react';

/* ─── Category type ────────────────────────────────── */
export interface Category {
 id: string;
 name: string;
 label: string;
 icon: any;
 color: string;
 count?: number;
}

/* ─── Category Definitions ──────────────────────────── */
export const CATEGORIES: Category[] = [
 { id: 'general', name: 'general', label: 'For You', icon: Sparkles, color: '#C97856' },
 { id: 'Sports', name: 'Sports', label: 'Sports', icon: Trophy, color: '#22C55E' },
 { id: 'Music', name: 'Music', label: 'Music', icon: Headphones, color: '#C97856' },
 { id: 'Art', name: 'Art', label: 'Art', icon: Palette, color: '#F59E0B' },
 { id: 'Dance', name: 'Dance', label: 'Dance', icon: Music, color: '#B8694A' },
 { id: 'Comedy', name: 'Comedy', label: 'Comedy', icon: Laugh, color: '#F97316' },
 { id: 'Fitness', name: 'Fitness', label: 'Fitness', icon: Dumbbell, color: '#10B981' },
 { id: 'Cooking', name: 'Cooking', label: 'Cooking', icon: UtensilsCrossed, color: '#EF4444' },
 { id: 'Photography', name: 'Photography', label: 'Photo', icon: Camera, color: '#06B6D4' },
 { id: 'Travel', name: 'Travel', label: 'Travel', icon: Plane, color: '#3B82F6' },
 { id: 'Fashion', name: 'Fashion', label: 'Fashion', icon: Shirt, color: '#EC4899' },
 { id: 'Tech Projects', name: 'Tech Projects', label: 'Tech', icon: Cpu, color: '#14B8A6' },
 { id: 'Singing', name: 'Singing', label: 'Singing', icon: Mic, color: '#EC4899' },
 { id: 'Poetry', name: 'Poetry', label: 'Poetry', icon: BookOpen, color: '#6366F1' },
 { id: 'Writing', name: 'Writing', label: 'Writing', icon: BookOpen, color: '#B8694A' },
 { id: 'Lifestyle', name: 'Lifestyle', label: 'Lifestyle', icon: Star, color: '#D946EF' },
 { id: 'Nature', name: 'Nature', label: 'Nature', icon: Leaf, color: '#16A34A' },
 { id: 'Date Ideas', name: 'Date Ideas', label: 'Dates', icon: Sparkles, color: '#EC4899' },
 { id: 'Career Highlights', name: 'Career Highlights', label: 'Career', icon: Briefcase, color: '#6366F1' },
 { id: 'Acting', name: 'Acting', label: 'Acting', icon: Clapperboard, color: '#F43F5E' },
];

/* ─── Format large numbers (e.g., 1200 → 1.2k) ─── */
export const fmt = (n: number): string => {
 if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
 if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
 return String(n);
};

/* ─── Gradient generator from category color ────────── */
export function catGradient(color: string) {
 return `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`;
}

/* ─── Time formatting ──────────────────────────────── */
export function timeAgo(dateStr: string) {
 const diff = Date.now() - new Date(dateStr).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return 'now';
 if (mins < 60) return `${mins}m`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h`;
 const days = Math.floor(hrs / 24);
 if (days < 7) return `${days}d`;
 return `${Math.floor(days / 7)}w`;
}
