// ─── Miamo Shared TypeScript Interfaces ──────────────
// Used by both frontend API client and backend services

export interface ApiResponse<T = unknown> {
  data: T;
  error?: { message: string; code: string; statusCode: number };
}

export interface MiamoUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  miamoId: string | null;
  verified: boolean;
  active: boolean;
  deactivated: boolean;
  premium: boolean;
  profileScore: number;
  avatar: string | null;
  createdAt: string;
}

export interface MiamoProfile {
  id: string;
  userId: string;
  age: number;
  gender: string;
  city: string;
  profession: string;
  bio: string;
  datingIntent: string;
  seriousMode: boolean;
  avatarGradient: string;
  profileScore: number;
  online: boolean;
  lastActive: string;
  height: number | null;
  sexuality: string;
  lookingFor: string;
  smoking: string;
  drinking: string;
  exercise: string;
  education: string;
  religion: string;
  zodiac: string;
  languages: string;
  pets: string;
  children: string;
  politicalViews: string;
  diet: string;
}

export interface MiamoPhoto {
  id: string;
  userId: string;
  url: string;
  position: number;
  caption: string;
}

export interface MiamoMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  active: boolean;
  score: number;
  favorite1: boolean;
  favorite2: boolean;
  pinned1: boolean;
  pinned2: boolean;
  createdAt: string;
  matchedUser?: MiamoUser & { profile: MiamoProfile | null; photos: MiamoPhoto[] };
}

export interface MiamoChat {
  id: string;
  user1Id: string;
  user2Id: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  theme: string;
  background: string;
  unreadCount: number;
  lastMessage: MiamoMessage | null;
  otherUser?: MiamoUser & { profile: MiamoProfile | null; photos: MiamoPhoto[] };
}

export interface MiamoMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  replyToId: string | null;
  replyTo?: MiamoMessage | null;
  readAt: string | null;
  deletedForAll: boolean;
  createdAt: string;
  sender?: { id: string; displayName: string; username: string };
}

export interface MiamoBeat {
  id: string;
  user1Id: string;
  user2Id: string;
  count: number;
  state: 'active' | 'weak' | 'lost' | 'archived';
  lastUser1: string | null;
  lastUser2: string | null;
  createdAt: string;
  otherUser?: MiamoUser & { profile: MiamoProfile | null; photos: MiamoPhoto[] };
}

export interface MiamoStory {
  id: string;
  authorId: string;
  content: string;
  type: string;
  background: string;
  expiresAt: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  author?: MiamoUser & { photos: MiamoPhoto[] };
}

export interface MiamoNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface MiamoSettings {
  id: string;
  userId: string;
  pushNotifications: boolean;
  emailNotifications: boolean;
  showOnlineStatus: boolean;
  showLastActive: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  showDistance: boolean;
  darkMode: boolean;
  language: string;
  ageRangeMin: number;
  ageRangeMax: number;
  maxDistance: number;
  genderPreference: string;
  // Nested objects returned by backend
  privacy?: Record<string, any>;
  notifications?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface MiamoBookmark {
  id: string;
  userId: string;
  targetId: string;
  targetType: string;
  note: string;
  createdAt: string;
  target?: MiamoUser & { profile: MiamoProfile | null; photos: MiamoPhoto[] };
}

export interface MiamoSession {
  id: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface DiscoverFilters {
  ageMin: number;
  ageMax: number;
  maxDistance: number;
  gender: string;
  city: string;
  religion: string;
  education: string;
  zodiac: string;
  smoking: string;
  drinking: string;
  exercise: string;
  pets: string;
  children: string;
  height: string;
  datingIntent: string;
}

export interface SearchResult {
  type: string;
  id: string;
  displayName: string;
  username: string;
  searchScore: number;
  profile?: MiamoProfile | null;
  photos?: MiamoPhoto[];
}
