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
  refreshToken: z.string().min(20).max(2048).optional(),
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
    cityLat: z.number().min(-90).max(90).nullable().optional(),
    cityLng: z.number().min(-180).max(180).nullable().optional(),
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

// Discover pass-feedback (structured reason capture).
// Accepts either `toUserId` (canonical, matches rest of discover surface) or
// `userId` (legacy alias kept for backward compat). At least one is required.
export const passFeedbackBodySchema = z
  .object({
    toUserId: z.string().min(1).max(64).optional(),
    userId: z.string().min(1).max(64).optional(),
    reason: z.string().trim().min(1).max(200),
    details: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Boolean(v.toUserId || v.userId), {
    message: 'toUserId is required',
    path: ['toUserId'],
  });

// Miamo Move (an in-app prompt sent to another user)
export const discoverMoveBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  message: z.string().trim().max(1000).optional(),
  targetType: z.string().max(40).optional(),
  targetId: z.string().max(64).nullable().optional(),
});

// Match-report / match-block (by-user variants reuse the report fields)
export const matchActionBodySchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
  details: z.string().trim().max(2000).optional(),
});

// Discover filters — keep permissive (server still whitelists fields).
// Just bound the shape so we can reject obviously hostile payloads early.
export const discoverFiltersBodySchema = z
  .object({
    minAge: z.number().int().min(18).max(120).optional(),
    maxAge: z.number().int().min(18).max(120).optional(),
    minHeight: z.number().int().min(50).max(250).optional(),
    maxHeight: z.number().int().min(50).max(250).optional(),
    distance: z.number().int().min(0).max(20000).optional(),
    city: z.string().trim().max(120).optional(),
    gender: z.string().trim().max(40).optional(),
    sexuality: z.string().trim().max(40).optional(),
    lookingFor: z.string().trim().max(80).optional(),
    smoking: z.string().trim().max(40).optional(),
    drinking: z.string().trim().max(40).optional(),
    exercise: z.string().trim().max(40).optional(),
    education: z.string().trim().max(120).optional(),
    religion: z.string().trim().max(80).optional(),
    zodiac: z.string().trim().max(40).optional(),
    pets: z.string().trim().max(120).optional(),
    children: z.string().trim().max(40).optional(),
    seriousOnly: z.boolean().optional(),
    verifiedOnly: z.boolean().optional(),
    activeToday: z.boolean().optional(),
    newHere: z.boolean().optional(),
    hasPhotos: z.boolean().optional(),
  })
  .passthrough();

// Messaging -------------------------------------------
// Content max raised to ~5MB to allow base64 image/video data URLs (text
// messages are still tiny). type='image'/'video'/'voice' indicates media.
export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(5_000_000),
  type: z.enum(['text', 'image', 'voice', 'video', 'sticker', 'system']).optional(),
  replyToId: z.string().max(64).optional().nullable(),
  // v3.6.0 — optional meta the client may attach when the message text
  // was selected from a Move v2 suggestion. The server uses this to
  // ratify `move.suggestion_accepted` (a KPI we cannot trust to a
  // client-only emit). All sub-fields are strict-bounded to keep payload
  // small and prevent free-form metadata abuse.
  meta: z.object({
    suggestionSlotIndex: z.number().int().min(0).max(4).optional(),
    suggestionHookCategory: z.string().max(32).optional(),
    suggestionTone: z.enum(['reflective', 'casual', 'tactile', 'quick']).optional(),
    suggestionReceiverHash: z.string().min(20).max(24).optional(),
  }).optional(),
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

// Edit a message (sender only; route enforces ownership). Text-only — media
// messages aren't editable, so a 5k cap is sufficient and prevents abuse.
export const messageEditBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

// Beats
export const beatStartBodySchema = z.object({
  matchedUserId: z.string().min(1).max(64),
});
export const beatCompleteBodySchema = z.object({
  type: z.enum(['snap', 'text', 'photo', 'voice', 'video', 'creative', 'mood', 'music', 'gif']).optional(),
  content: z.string().max(5_000_000).optional(),
});

// v3.6.0 consent toggles. Additive — server still whitelists into the
// Settings update. Default OFF in code; route handler keeps behaviour
// byte-identical for callers that omit them.
export const settingsConsentToggles = z.object({
  moodInferenceEnabled: z.boolean().optional(),
  behavioralRankingEnabled: z.boolean().optional(),
  crossUserInferenceEnabled: z.boolean().optional(),
  algorithmicTransparency: z.boolean().optional(),
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
    // v3.6.0 consent toggles (merged from settingsConsentToggles)
    moodInferenceEnabled: z.boolean().optional(),
    behavioralRankingEnabled: z.boolean().optional(),
    crossUserInferenceEnabled: z.boolean().optional(),
    algorithmicTransparency: z.boolean().optional(),
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

// ─── v3.6.0 — Move v2 + Family Brief request bodies ───
export const moveSuggestionsV2BodySchema = z.object({
  n: z.number().int().min(1).max(5).optional(),
  seed: z.number().int().optional(),
});

export const familyBriefGenerateBodySchema = z.object({
  format: z.enum(['pdf', 'image', 'text']),
  trackViews: z.boolean().optional(),
});

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
// mediaUrl raised to ~5MB to support base64 image/video data URLs from the
// client-side compression pipeline (compressed JPEG/WebM).
export const feedPostBodySchema = z.object({
  type: z.string().max(40).optional(),
  content: z.string().trim().max(5000).optional(),
  mediaUrl: z.string().trim().max(5_000_000).optional().nullable(),
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
  // Allow either a normal URL or a base64 data URL up to ~5 MB so the web
  // client can ship locally-edited (filtered + captioned) JPEGs without
  // requiring object storage. Plain URLs stay tiny; data URLs are bounded
  // by the canvas pipeline (max 1080x1920 @ q=0.85).
  mediaUrl: z.string().trim().max(5_000_000).optional().nullable(),
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
  // url/thumbnailUrl raised to ~5MB to accept base64 data URLs from the
  // client-side video compression pipeline.
  url: z.string().trim().min(1).max(5_000_000),
  thumbnailUrl: z.string().trim().max(5_000_000).optional().nullable(),
  category: z.string().max(80).optional(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
});

// Notifications ---------------------------------------
export const markReadBodySchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(500).optional(),
});

// ─── v3.2 Showcase ─────────────────────────────────────
export const SHOWCASE_CATEGORIES = [
  'music', 'visual-art', 'writing', 'photography', 'cooking', 'dance',
  'fitness', 'comedy', 'tech-code', 'crafts', 'performance', 'other',
] as const;

export const SHOWCASE_LINK_ALLOWLIST = [
  'youtube.com', 'youtu.be',
  'soundcloud.com',
  'open.spotify.com',
  'github.com',
  'behance.net',
  'substack.com',
  'bandcamp.com',
  'vimeo.com',
  'are.na',
  'instagram.com', // public reels only — enforced server-side via /reel/ check
] as const;

export const showcaseCreateBodySchema = z.object({
  category: z.enum(SHOWCASE_CATEGORIES),
  type: z.enum(['link', 'image', 'text', 'voice']),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(300).optional(),
  url: z.string().trim().min(1).max(2048).optional(),
  imageUrl: z.string().trim().min(1).max(2048).optional(),
  voiceUrl: z.string().trim().min(1).max(2048).optional(),
  voiceDurationMs: z.number().int().min(0).max(120_000).optional(),
  pinned: z.boolean().optional(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
}).refine(
  (v) => (v.type === 'link' && !!v.url) || (v.type === 'image' && !!v.imageUrl) ||
         (v.type === 'voice' && !!v.voiceUrl) || (v.type === 'text' && !!v.body),
  { message: 'payload must match type (link→url, image→imageUrl, voice→voiceUrl, text→body)' },
);

export const showcaseUpdateBodySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().max(300).optional(),
  url: z.string().trim().min(1).max(2048).optional(),
  imageUrl: z.string().trim().min(1).max(2048).optional(),
  pinned: z.boolean().optional(),
  visibility: z.enum(['everyone', 'matches', 'private']).optional(),
}).passthrough();

export const showcaseMoveBodySchema = z.object({
  fromUserId: z.string().min(1).max(64),
  message: z.string().trim().max(500).optional(),
});

// ─── v3.2 Access Control ───────────────────────────────
export const ACCESS_FIELDS = [
  'photos', 'phone', 'family', 'income', 'kundli',
  'lastName', 'exactCity', 'socials', 'email',
] as const;

export const accessRequestCreateBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  field: z.enum(ACCESS_FIELDS),
  message: z.string().trim().max(500).optional(),
});

export const accessRequestDecisionBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ─── v3.2 DTM Profile Fields ───────────────────────────
export const dtmProfileUpdateBodySchema = z.object({
  familyBackground:   z.string().trim().max(280).optional().nullable(),
  educationLevel:     z.string().trim().max(80).optional().nullable(),
  educationInstitution: z.string().trim().max(160).optional().nullable(),
  employer:           z.string().trim().max(160).optional().nullable(),
  incomeBand:         z.string().trim().max(40).optional().nullable(),
  subCommunity:       z.string().trim().max(80).optional().nullable(),
  maritalStatus:      z.enum(['never-married', 'divorced', 'widowed', 'separated']).optional().nullable(),
  willingToRelocate:  z.boolean().optional().nullable(),
  familyInvolved:     z.boolean().optional().nullable(),
  expectedTimeline:   z.enum(['6mo', '1yr', '2yr+']).optional().nullable(),
  kundliUrl:          z.string().trim().max(2048).optional().nullable(),
}).passthrough();

// ─── v6.6 Deferred Items (see-later pile) ───────────────
export const DEFER_SURFACES = ['discover', 'dtm'] as const;
export const DEFER_ACTIONS = ['like', 'pass', 'super_like', 'see_later', 'answered', 'skipped'] as const;
export const DEFER_REASONS = ['not_now', 'thinking', 'unsure', 'other'] as const;
export const DEFER_PILE_CAP = 100;

export const deferCreateBodySchema = z.object({
  surface:  z.enum(DEFER_SURFACES),
  targetId: z.string().min(1).max(128),
  topic:    z.string().min(1).max(64).optional(),
  batchId:  z.string().min(1).max(64).optional(),
  reason:   z.enum(DEFER_REASONS).optional(),
});

export const deferListQuerySchema = z.object({
  surface: z.enum(DEFER_SURFACES),
  kind:    z.enum(['pending', 'resolved', 'all']).optional().default('pending'),
  limit:   z.coerce.number().int().min(1).max(DEFER_PILE_CAP).optional().default(DEFER_PILE_CAP),
});

export const deferResolveBodySchema = z.object({
  action: z.enum(DEFER_ACTIONS),
});
