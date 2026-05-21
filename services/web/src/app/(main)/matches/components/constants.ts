import {
 ThumbsDown, Heart, Ghost, AlertCircle, Camera, Frown,
 Users, MessageSquare, MapPin, HandMetal,
 AlertTriangle, Shield, Ban, Volume2, Eye, Flag,
 Pause, Sparkles,
} from 'lucide-react';

export const UNMATCH_REASONS = [
 { code: 'not-interested', label: 'No longer interested', icon: ThumbsDown },
 { code: 'found-someone', label: 'Found someone else', icon: Heart },
 { code: 'no-response', label: 'They never responded', icon: Ghost },
 { code: 'inappropriate-msgs', label: 'Inappropriate messages', icon: AlertCircle },
 { code: 'fake-profile', label: 'Fake or misleading profile', icon: Camera },
 { code: 'uncomfortable', label: 'Made me uncomfortable', icon: Frown },
 { code: 'different-goals', label: 'Different relationship goals', icon: Users },
 { code: 'bad-conversation', label: 'Poor conversation quality', icon: MessageSquare },
 { code: 'too-far', label: 'Too far away', icon: MapPin },
 { code: 'taking-break', label: "Taking a break from dating", icon: HandMetal },
];

export const REPORT_REASONS = [
 { code: 'harassment', label: 'Harassment or bullying', icon: AlertCircle },
 { code: 'inappropriate', label: 'Inappropriate content', icon: AlertTriangle },
 { code: 'fake-profile', label: 'Fake or scam profile', icon: Camera },
 { code: 'underage', label: 'Underage user', icon: Shield },
 { code: 'hate-speech', label: 'Hate speech or discrimination', icon: Ban },
 { code: 'threats', label: 'Threats or violence', icon: AlertCircle },
 { code: 'spam', label: 'Spam or commercial activity', icon: Volume2 },
 { code: 'impersonation', label: 'Impersonating someone', icon: Ghost },
 { code: 'explicit-unsolicited', label: 'Unsolicited explicit content', icon: Frown },
 { code: 'other', label: 'Something else', icon: Flag },
];

export const BLOCK_REASONS = [
 { code: 'harassment', label: 'Harassment or offensive behavior', icon: AlertCircle },
 { code: 'unsafe', label: 'Made me feel unsafe', icon: Shield },
 { code: 'spam', label: 'Spam or scam', icon: Volume2 },
 { code: 'threats', label: 'Threatening behavior', icon: AlertTriangle },
 { code: 'fake', label: 'Fake profile', icon: Camera },
 { code: 'stalking', label: 'Stalking or obsessive contact', icon: Eye },
 { code: 'other', label: 'Other reason', icon: Flag },
];

export const mainTabs = [
 { id: 'incoming', label: 'Incoming', icon: Heart },
 { id: 'matches', label: 'My Matches', icon: Sparkles },
 { id: 'held', label: 'On Hold', icon: Pause },
];

export const matchFilters = [
 { id: 'all', label: 'All' },
 { id: 'new', label: 'New' },
 { id: 'active', label: 'Active' },
 { id: 'favorites', label: 'Favorites' },
 { id: 'serious', label: 'Serious' },
];
