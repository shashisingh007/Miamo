import {
 Camera, Film, Mic, MessageSquare, Palette, Heart, Music, Play,
 Lightbulb, Sparkles, Moon, Coffee,
 ThumbsUp, EyeOff, Shield, AlertTriangle, Flag, Ban,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
 INTERFACES
 ═══════════════════════════════════════════════════════════ */
export interface BeatMatch {
 id: string;
 matchId: string;
 matchedUser: { id: string; displayName: string; photos: any[]; online?: boolean; verified?: boolean };
 count: number;
 state: string;
 todayCompleted: boolean;
 iSentToday: boolean;
 theyCompletedToday: boolean;
 streakDeadline: string; // ISO timestamp — when the 24h window ends
 lastBeatAt?: string;
 longestStreak?: number;
 totalSent?: number;
 totalReceived?: number;
}

export interface BeatEntry {
 id: string;
 type: string;
 content: string;
 sender: 'me' | 'them';
 sentAt: string;
 seen?: boolean;
 showInChat?: boolean;
 // Snapchat-style ephemeral flags (received media only)
 ephemeralLocked?: boolean; // not yet viewed; content scrubbed by server
 viewCount?: number;
 mediaSaved?: boolean;
 mediaCleared?: boolean;
}

/* ═══════════════════════════════════════════════════════════
 BEAT TYPES
 ═══════════════════════════════════════════════════════════ */
export const BEAT_TYPES = [
 { type: 'photo', icon: Camera, label: 'Photo', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Share a moment' },
 { type: 'video', icon: Film, label: 'Video', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Send a clip' },
 { type: 'voice', icon: Mic, label: 'Voice', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Voice note' },
 { type: 'text', icon: MessageSquare, label: 'Text', color: 'text-rose', bg: 'bg-miamo-surface0/10', desc: 'Quick thought' },
 { type: 'creative', icon: Palette, label: 'Creative', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Art & doodles' },
 { type: 'mood', icon: Heart, label: 'Mood', color: 'text-rose', bg: 'bg-miamo-surface0/10', desc: 'How you feel' },
 { type: 'music', icon: Music, label: 'Music', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Share a song' },
 { type: 'gif', icon: Play, label: 'GIF', color: 'text-rose-main', bg: 'bg-rose-main/10', desc: 'Fun reaction' },
];

export const ICE_BREAKERS: { category: string; icon: any; prompts: string[] }[] = [
 { category: 'Starters', icon: Lightbulb, prompts: [
 "What's the best thing that happened to you today? \u2600\uFE0F",
 "If you could teleport anywhere right now, where would you go? \uD83C\uDF0D",
 "What song is stuck in your head today? \uD83C\uDFB5",
 "Tell me something random about yourself I'd never guess \uD83E\uDD14",
 "What's your comfort food when you're having a bad day? \uD83C\uDF55",
 ]},
 { category: 'Fun', icon: Sparkles, prompts: [
 "Would you rather always be slightly cold or slightly hot? \uD83E\uDDCA\uD83D\uDD25",
 "What's the most embarrassing autocorrect you've had? \uD83D\uDE02",
 "On a scale of 1-10, how addicted to your phone are you? \uD83D\uDCF1",
 "What's your go-to karaoke song? \uD83C\uDFA4",
 "If you were a pizza topping, what would you be? \uD83C\uDF55",
 ]},
 { category: 'Deep', icon: Moon, prompts: [
 "What's something you're proud of but rarely get to talk about? \uD83C\uDF1F",
 "What does your ideal lazy Sunday look like? \u2615",
 "If money wasn't a thing, what would you do with your life? \uD83D\uDCAD",
 "What's a small act of kindness that stuck with you? \uD83D\uDC95",
 "What's on your bucket list that surprises people? \u2708\uFE0F",
 ]},
 { category: 'Know You', icon: Coffee, prompts: [
 "Morning person or night owl? No wrong answer \uD83C\uDF05\uD83E\uDD89",
 "What are you binge-watching right now? \uD83D\uDCFA",
 "Dogs, cats, or... chameleons? \uD83D\uDC15\uD83D\uDC08",
 "What's your love language? \uD83D\uDC9D",
 "Coffee, tea, or neither? This is important. \u2615\uD83C\uDF75",
 ]},
];

export const MILESTONE_EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
 3: { emoji: '🔥', label: 'First Spark!', color: 'text-rose-main' },
 7: { emoji: '⭐', label: 'Week Warrior!', color: 'text-rose-main' },
 14: { emoji: '💫', label: 'Two Week Champion!', color: 'text-rose-main' },
 30: { emoji: '🏆', label: 'Monthly Master!', color: 'text-rose-main' },
 50: { emoji: '💎', label: 'Diamond Streak!', color: 'text-rose-main' },
 100: { emoji: '👑', label: 'Beat Royalty!', color: 'text-rose-alt' },
 150: { emoji: '🌟', label: 'Legendary!', color: 'text-rose-light' },
 200: { emoji: '🔱', label: 'Unstoppable!', color: 'text-rose-alt' },
 365: { emoji: '🎂', label: '1 Year Anniversary!', color: 'text-rose' },
 500: { emoji: '💝', label: 'Soulmate Streak!', color: 'text-rose' },
 730: { emoji: '💍', label: '2 Year Bond!', color: 'text-rose-main' },
 1095: { emoji: '🏛️', label: '3 Year Legacy!', color: 'text-rose-main' },
 1460: { emoji: '🌍', label: '4 Year Journey!', color: 'text-rose-main' },
 1825: { emoji: '♾️', label: '5 Year Forever!', color: 'text-rose-light' },
};

export const REMOVE_REASONS = [
 { code: 'lost-interest', label: 'Lost interest', icon: ThumbsUp },
 { code: 'no-response', label: 'They never respond', icon: EyeOff },
 { code: 'uncomfortable', label: 'Made me uncomfortable', icon: Shield },
 { code: 'found-someone', label: 'Found someone else', icon: Heart },
 { code: 'taking-break', label: 'Taking a break', icon: Coffee },
];

export const BLOCK_REASONS = [
 { code: 'harassment', label: 'Harassment', icon: AlertTriangle },
 { code: 'inappropriate', label: 'Inappropriate content', icon: Flag },
 { code: 'spam', label: 'Spam / fake', icon: Ban },
 { code: 'unsafe', label: 'Made me feel unsafe', icon: Shield },
];

/* ═══════════════════════════════════════════════════════════
 HELPER FUNCTIONS
 ═══════════════════════════════════════════════════════════ */
export function getStreakDeadline(): string {
 const now = new Date();
 const deadline = new Date(now);
 deadline.setHours(23, 59, 59, 999);
 return deadline.toISOString();
}

export function getHoursLeft(deadline: string): number {
 return Math.max(0, (new Date(deadline).getTime() - Date.now()) / 3600000);
}

export function formatTimeLeft(deadline: string): string {
 const ms = new Date(deadline).getTime() - Date.now();
 if (ms <= 0) return 'Expired';
 const h = Math.floor(ms / 3600000);
 const m = Math.floor((ms % 3600000) / 60000);
 if (h > 0) return `${h}h ${m}m left`;
 return `${m}m left`;
}
