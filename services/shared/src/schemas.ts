/**
 * Reusable zod primitives for cross-service request validation.
 * Keep schemas SMALL and composable — wider ones live next to their endpoint.
 */
import { z } from 'zod';

// Auth -------------------------------------------------
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email too short')
  .max(254, 'Email too long')
  .email('Invalid email format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name required')
  .max(80, 'Display name too long');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).max(2048),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

// Pagination ------------------------------------------
export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

// IDs -------------------------------------------------
export const idParamSchema = z.object({ id: z.string().min(1).max(64) });
export const userIdParamSchema = z.object({ userId: z.string().min(1).max(64) });

// Profile ---------------------------------------------
const optStr = (max: number) => z.string().trim().max(max).optional().nullable();
const optInt = (min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v === null || v === '' || v === undefined) return null;
      const n = typeof v === 'string' ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? n : null;
    })
    .pipe(z.number().int().min(min).max(max).nullable())
    .optional();
const optBool = z.boolean().optional();
const optStrArray = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().max(maxLen)).max(maxItems).optional();

export const updateProfileBodySchema = z
  .object({
    age: optInt(18, 120),
    gender: optStr(40),
    city: optStr(120),
    profession: optStr(120),
    bio: optStr(2000),
    datingIntent: optStr(80),
    seriousMode: optBool,
    avatarGradient: optStr(80),
    height: optInt(50, 250),
    sexuality: optStr(40),
    lookingFor: optStr(80),
    smoking: optStr(40),
    drinking: optStr(40),
    exercise: optStr(40),
    education: optStr(120),
    religion: optStr(80),
    zodiac: optStr(40),
    languages: optStrArray(20, 40),
    pets: optStr(120),
    children: optStr(40),
    politicalViews: optStr(40),
    diet: optStr(40),
  })
  // Permissive: server-side whitelist still filters fields; this just type-checks the known ones.
  .passthrough();

export const profilePromptsBodySchema = z.object({
  prompts: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(200),
        answer: z.string().trim().min(1).max(500),
      }),
    )
    .max(10),
});

export const profileInterestsBodySchema = z.object({
  interests: z.array(z.string().trim().min(1).max(40)).max(30),
});

// Settings --------------------------------------------
export const settingsBodySchema = z.object({}).passthrough(); // legacy: server still hand-filters fields
export const privacySettingsBodySchema = z.object({}).passthrough();

// Social ----------------------------------------------
export const discoverLikeBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  targetType: z.string().max(40).optional(),
  targetId: z.string().max(64).nullable().optional(),
});

export const discoverPassBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  reason: z.string().max(200).optional(),
});

export const discoverCommentBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  message: z.string().trim().max(1000).optional(),
  type: z.string().max(40).optional(),
  targetType: z.string().max(40).optional(),
  targetId: z.string().max(64).nullable().optional(),
});

export const reportBodySchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
  details: z.string().trim().max(2000).optional(),
});

export const vibeCheckBodySchema = z.object({
  mood: z.string().trim().max(80),
  energy: z.union([z.string(), z.number()]).optional(),
  topics: z.array(z.string().trim().max(80)).max(20).optional(),
  intent: z.string().trim().max(120).optional(),
});

// Messaging -------------------------------------------
export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  type: z.enum(['text', 'image', 'voice', 'video', 'sticker', 'system']).optional(),
  replyToId: z.string().max(64).optional().nullable(),
});

export const messageReactBodySchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const chatThemeBodySchema = z
  .object({
    theme: z.string().trim().min(1).max(40).optional(),
    background: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.theme !== undefined || v.background !== undefined, {
    message: 'theme or background is required',
  });

// Chat boolean toggles (pin/mute/archive)
export const chatPinBodySchema = z.object({ pinned: z.boolean().optional() });
export const chatMuteBodySchema = z.object({ muted: z.boolean().optional() });
export const chatArchiveBodySchema = z.object({ archived: z.boolean().optional() });

// Edit a message (sender only; route enforces ownership)
export const messageEditBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

// Beats
export const beatStartBodySchema = z.object({
  matchedUserId: z.string().min(1).max(64),
});
export const beatCompleteBodySchema = z.object({
  type: z.enum(['snap', 'text', 'photo', 'voice', 'video']).optional(),
  content: z.string().trim().max(1000).optional(),
});

// Settings (lenient — server still hand-filters fields, but we cap obvious abuse)
export const settingsUpdateBodySchema = z
  .object({
    theme: z.string().max(40).optional(),
    accentColor: z.string().max(40).optional(),
    reduceMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    readReceipts: z.boolean().optional(),
    typingIndicator: z.boolean().optional(),
    onlineStatus: z.boolean().optional(),
    lastActiveVisible: z.boolean().optional(),
    whoCanMessage: z.string().max(40).optional(),
    whoCanSendMedia: z.string().max(40).optional(),
    whoCanStartBeat: z.string().max(40).optional(),
    whoCanBroadcast: z.string().max(40).optional(),
    whoCanVoiceCall: z.string().max(40).optional(),
    whoCanVideoCall: z.string().max(40).optional(),
    storyVisibility: z.string().max(40).optional(),
    feedVisibility: z.string().max(40).optional(),
    videoVisibility: z.string().max(40).optional(),
    creativityVisibility: z.string().max(40).optional(),
    notificationsEnabled: z.boolean().optional(),
    beatReminders: z.boolean().optional(),
    messageNotifications: z.boolean().optional(),
    storyNotifications: z.boolean().optional(),
    privacyMode: z.boolean().optional(),
    invisibleMode: z.boolean().optional(),
    seriousModeEnabled: z.boolean().optional(),
    aiPersonalization: z.boolean().optional(),
    notifications: z
      .object({
        matches: z.boolean().optional(),
        messages: z.boolean().optional(),
        beats: z.boolean().optional(),
        stories: z.boolean().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export const privacyUpdateBodySchema = z
  .object({
    profileVisible: z.boolean().optional(),
    searchable: z.boolean().optional(),
    miamoIdSearchable: z.boolean().optional(),
    nameSearchable: z.boolean().optional(),
    citySearchable: z.boolean().optional(),
    hideExactCity: z.boolean().optional(),
    showApproxCity: z.boolean().optional(),
    disableSearch: z.boolean().optional(),
    // frontend aliases (server maps to real fields)
    searchByName: z.boolean().optional(),
    searchByMiamoId: z.boolean().optional(),
    searchByCity: z.boolean().optional(),
    onlineStatus: z.boolean().optional(),
    lastActive: z.boolean().optional(),
    readReceipts: z.boolean().optional(),
    typingIndicator: z.boolean().optional(),
    seriousMode: z.boolean().optional(),
    aiPersonalization: z.boolean().optional(),
  })
  .passthrough();

// Content ---------------------------------------------
export const feedPostBodySchema = z.object({
  type: z.string().max(40).optional(),
  content: z.string().trim().max(5000).optional(),
  mediaUrl: z.string().trim().max(2048).optional().nullable(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
});

export const feedPostUpdateBodySchema = z.object({
  type: z.string().max(40).optional(),
  content: z.string().trim().max(5000).optional(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
});

export const reactionBodySchema = z.object({
  type: z.string().trim().max(40).optional(),
});

export const commentBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().max(64).optional().nullable(),
});

export const storyBodySchema = z.object({
  type: z.string().max(40).optional(),
  content: z.string().trim().max(5000).optional(),
  mediaUrl: z.string().trim().max(2048).optional().nullable(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
  expiresInHours: z.number().int().min(1).max(168).optional(),
  background: z.union([z.string().max(120), z.record(z.string(), z.unknown())]).optional(),
});

export const storyReactBodySchema = z.object({
  reaction: z.string().trim().min(1).max(40),
});

export const videoBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  url: z.string().trim().min(1).max(2048),
  thumbnailUrl: z.string().trim().max(2048).optional().nullable(),
  category: z.string().max(80).optional(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
});

// Notifications ---------------------------------------
export const markReadBodySchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(500).optional(),
});
