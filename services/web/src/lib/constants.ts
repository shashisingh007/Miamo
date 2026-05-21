// ─── Miamo Navigation ────────────────────────────────────
import {
 Compass, Users, MessageCircle, Zap, Camera,
 Sparkles, Search, User, Settings, Brain, Heart,
 Shield, Crown, Bell, CalendarHeart, Puzzle, HeartHandshake,
 AudioLines, Lightbulb, MapPin, Palette,
} from 'lucide-react';

export const APP_NAME = 'Miamo';
export const APP_TAGLINE = 'Where connections become something real';
export const APP_DESCRIPTION = 'A premium dating and social platform for meaningful connections, thoughtful matching, and authentic relationships.';

export const NAV_MAIN = [
 { label: 'Discover', href: '/discover', icon: Compass },
 { label: 'Matches', href: '/matches', icon: Users },
 { label: 'Messages', href: '/messages', icon: MessageCircle },
 { label: 'Beats', href: '/beats', icon: Zap },
 { label: 'Stories', href: '/stories', icon: Camera },
 { label: 'Creativity', href: '/creativity', icon: Sparkles },
 { label: 'Date to Marry', href: '/serious-mode', icon: HeartHandshake },
] as const;

export const NAV_SECONDARY = [
 { label: 'AI Match', href: '/ai-match', icon: Brain },
 { label: 'Date Planner', href: '/date-planner', icon: CalendarHeart },
 { label: 'Compatibility', href: '/compatibility', icon: Puzzle },
 { label: 'Love Language', href: '/love-language', icon: Heart },
 { label: 'Vibe Check', href: '/vibe-check', icon: AudioLines },
 { label: 'Date Ideas', href: '/date-ideas', icon: Lightbulb },
 { label: 'Search', href: '/search', icon: Search },
 { label: 'Profile', href: '/profile', icon: User },
 { label: 'Notifications', href: '/notifications', icon: Bell },
 { label: 'Safety', href: '/safety', icon: Shield },
 { label: 'Settings', href: '/settings', icon: Settings },
 { label: 'Premium', href: '/premium', icon: Crown },
] as const;

// ─── Feature Names (replacing old Heart* naming) ────────
export const FEATURES = {
 discover: 'Discover',
 matches: 'Matches',
 messages: 'Messages',
 beats: 'Beats',
 feed: 'Feed',
 stories: 'Stories',
 videos: 'Videos',
 creativity: 'Creativity',
 search: 'Search',
 aiMatch: 'AI Match',
 matchFilters: 'Match Filters',
 dateToMarry: 'Date to Marry',
 verification: 'Verification',
 privacy: 'Privacy',
 safety: 'Safety',
 profileScore: 'Profile Score',
 premiumBoost: 'Premium Boost',
 memories: 'Memories',
 vault: 'Vault',
 broadcast: 'Broadcast',
 voiceCall: 'Voice Call',
 videoCall: 'Video Call',
 miamoId: 'Miamo ID',
} as const;

// ─── Interests ──────────────────────────────────────────
export const INTEREST_CATEGORIES = [
 'Travel', 'Photography', 'Music', 'Art', 'Cooking', 'Fitness',
 'Reading', 'Movies', 'Gaming', 'Nature', 'Yoga', 'Dancing',
 'Writing', 'Fashion', 'Coffee', 'Wine', 'Hiking', 'Running',
 'Meditation', 'Surfing', 'Climbing', 'Concerts', 'Theater',
 'Podcasts', 'Volunteering', 'Pets', 'Startups', 'Design',
] as const;

// ─── Profile Prompts ────────────────────────────────────
export const PROFILE_PROMPTS = [
 "A perfect first date for me looks like\u2026",
 "I\u0027m looking for someone who\u2026",
 "My most controversial opinion is\u2026",
 "The way to win me over is\u2026",
 "I geek out about\u2026",
 "My love language is\u2026",
 "The most spontaneous thing I\u0027ve done\u2026",
 "I feel most alive when\u2026",
 "Something that surprises people about me\u2026",
 "My ideal weekend involves\u2026",
 "The key to my heart is\u2026",
 "I\u0027m convinced that\u2026",
] as const;

// ─── Beat (streak) States ───────────────────────────────
export const BEAT_STATES = {
 strong: { label: 'Strong', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
 soft: { label: 'Soft', color: 'text-rose-main', bg: 'bg-rose-main/10' },
 weak: { label: 'Weak', color: 'text-amber-400', bg: 'bg-amber-400/10' },
 critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10' },
 lost: { label: 'Lost', color: 'text-text-muted', bg: 'bg-miamo-surface' },
 archived: { label: 'Archived', color: 'text-text-muted', bg: 'bg-miamo-surface' },
} as const;

// ─── Relationship Intents ───────────────────────────────
export const RELATIONSHIP_INTENTS = [
 'Long-term relationship',
 'Short-term, open to long',
 'Looking for something casual',
 'Still figuring it out',
 'Life partner',
 'Serious only',
] as const;
