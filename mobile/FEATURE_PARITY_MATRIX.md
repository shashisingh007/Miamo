# Mobile ↔ Web Feature Parity Matrix

Regression-locked by [tests/feature-parity.test.ts](tests/feature-parity.test.ts). Every row's Mobile Screen file must exist on disk — else the parity test fails.

## §1 — Top-level routes / screens

| # | Web Route | Mobile Screen | Backend Route | Depth (mobile / web LOC) | Feature Parity |
|---|-----------|---------------|---------------|--------------------------|----------------|
| 1 | (main)/access | AccessScreen.tsx | /api/v1/matrimonial/access/* | 151 / 112 | ✅ Full |
| 2 | (main)/ai-match | AiMatchScreen.tsx | /api/v1/ai-match/* | 93 / 119 | ✅ Full |
| 3 | (main)/beats | BeatsScreen.tsx | /api/v1/beats + events | **672** / 821 | ✅ Full — 4 tabs, start/complete/miss/expire/restore/archive + save/screenshot/download/replay/view |
| 4 | (main)/compatibility | CompatibilityScreen.tsx | /api/v1/matrimonial/compatibility/:id | 83 / 320 | ⚠️ Basic — read-only scoring; more visualizations queued |
| 5 | (main)/creativity | CreativityScreen.tsx | /api/v1/creativity/* | **1086** / 276 | ✅ Full — Reels + Feed + Categories + Vault + Trending + Spotlight; all 20 creativity actions wired |
| 6 | (main)/date-ideas | DateIdeasScreen.tsx | /api/v1/vibe-check/matches | 96 / 274 | ⚠️ Basic |
| 7 | (main)/date-planner | DatePlannerScreen.tsx | (local — no backend yet) | 71 / 473 | ⚠️ Basic |
| 8 | (main)/discover | DiscoverScreen.tsx | /api/v1/discover | **988** / 802 | ✅ Full — deck swipe, filters, pass-feedback, super-like, Move v2, WhyCard, defer, MatchSuccessModal, WeeklyTop10 |
| 9 | (main)/dtm | DtmScreen.tsx | /api/v1/matrimonial/* + /api/v1/dtm/* | **476** / 407 | ✅ Full — profile, discover, matches, access requests, family brief, templates, kundli/numerology links |
| 10 | (main)/dtm (chat sub-screen) | DtmChatScreen.tsx | /api/v1/matrimonial/chat/* | 283 | ✅ Full |
| 11 | (main)/dtm/kundli (sub) | KundliScreen.tsx | /api/v1/matrimonial/kundli | 262 | ✅ Full |
| 12 | (main)/dtm/numerology (sub) | NumerologyScreen.tsx | /api/v1/matrimonial/numerology/* | 167 | ✅ Full |
| 13 | (main)/feed | FeedScreen.tsx | /api/v1/feed | **530** / 305 | ✅ Full — list, compose, react, comment, edit, delete |
| 14 | (main)/love-language | LoveLanguageScreen.tsx | /api/v1/vibe-check | 99 / 328 | ⚠️ Basic |
| 15 | (main)/matches | MatchesScreen.tsx | /api/v1/matches | **657** / 657 | ✅ Full — 4 tabs (matches / incoming / requests / sent) with all per-tab actions + MoveV2 + suggestions + unmatch/report |
| 16 | (main)/messages | MessagesScreen.tsx | /api/v1/messages/chats | **352** / 512 | ✅ Full — active/archived tabs, local + server search, long-press context (pin/mute/archive/clear) |
| 17 | (main)/messages/[chatId] | ChatScreen.tsx | /api/v1/messages/chats/:id/* | **638** / — | ✅ Full — inverted FlatList, cursor infinite scroll, optimistic send, edit/reply/react/delete-for-me/for-all, MoveV2, AI suggestions, moderation, theme picker |
| 18 | (main)/notifications | NotificationsScreen.tsx | /api/v1/notifications | 92 / 115 | ✅ Full |
| 19 | (main)/onboarding | OnboardingScreen.tsx | /api/v1/profiles/me + verify | **668** / 901 | ✅ Full — 11-step wizard, per-step save, expo-location, PhotoUpload, DTM branch, selfie verify |
| 20 | (main)/premium | PremiumScreen.tsx | /api/v1/creativity/spotlight/purchase | 56 / 93 | ⚠️ Basic — IAP wiring pending |
| 21 | (main)/profile | ProfileScreen.tsx | /api/v1/profiles/me | **307** / 600 | ✅ Full — photos strip, verification badge, stats, prompts, interests, TrustScoreCard, view-as toggle |
| 22 | (main)/profile/edit (sub) | ProfileEditScreen.tsx | /api/v1/profiles/me | **572** / — | ✅ Full — 9 section-scoped saves (photos, basics, location, physical, work, bio, intent, prompts, interests, preferences) |
| 23 | (main)/safety | SafetyScreen.tsx | /api/v1/safety/* | 116 / 231 | ✅ Full |
| 24 | (main)/search | SearchScreen.tsx | /api/v1/search | 80 / 109 | ✅ Full |
| 25 | (main)/serious-mode | SeriousModeScreen.tsx | /api/v1/matrimonial/* | **854** / 1,339 | ✅ Full — advanced filters, matrimonial browse, compatibility, access requests, numerology |
| 26 | (main)/settings | SettingsScreen.tsx | /api/v1/settings/* | 386 / 837 | ✅ Full — hub + 8 sub-screens (see §2) |
| 27 | (main)/showcase | ShowcaseScreen.tsx | /api/v1/creativity/spotlight | 73 / 112 | ✅ Full |
| 28 | (main)/stories | StoriesScreen.tsx | /api/v1/stories | **692** / 373 | ✅ Full — story ring, full-screen viewer, like/react/comment/reply, viewers, likes, post-to-feed, delete |
| 29 | (main)/verify | VerifyScreen.tsx | /api/v1/profiles/me/verify/* | 124 / 173 | ✅ Full |
| 30 | (main)/vibe-check | VibeCheckScreen.tsx | /api/v1/vibe-check | **345** / 397 | ✅ Full — save, latest, history, matches |
| 31 | (main)/videos | VideosScreen.tsx | /api/v1/videos | **357** / 161 | ✅ Full — feed, play, react, comment, create |
| 32 | (main)/admin/fairness | admin/FairnessScreen.tsx | /api/v1/admin/fairness-gini | 165 / — | ✅ Full (admin-only, `user.isAdmin` gate) |
| 33 | auth (pre-tabs) | AuthScreen.tsx | /api/v1/auth/* | **616** / — | ✅ Full — 9 modes: login, signup 3-step, otp-start/verify, email/phone verify, 2fa, Google/Apple |
| 34 | (main)/matches/dtm | DtmMatchScreen.tsx | /api/v1/matrimonial/matches | 84 / — | ✅ Full — DTM-specific match landing |

## §2 — Settings sub-screens

| # | Web Sub-Route | Mobile Screen | Backend Route | LOC |
|---|--------------|---------------|---------------|-----|
| 1 | /settings/privacy | settings/PrivacyScreen.tsx | /api/v1/settings/privacy | 262 |
| 2 | /settings/blocks | settings/BlockedUsersScreen.tsx | /api/v1/settings/blocks + /api/v1/safety/unblock | 149 |
| 3 | /settings/devices | settings/TrustedDevicesScreen.tsx | /api/v1/auth/devices | 157 |
| 4 | /settings/deactivate | settings/DeactivateScreen.tsx | /api/v1/settings/deactivate + reactivate | 182 |
| 5 | /settings/delete | settings/DeleteAccountScreen.tsx | /api/v1/settings/delete | 152 |
| 6 | /settings/export | settings/DataExportScreen.tsx | /api/v1/settings/export | 109 |
| 7 | /settings/intent | settings/IntentOverrideScreen.tsx | /api/v1/settings/intent-status + intent-override | 170 |
| 8 | /settings/trust | settings/TrustScoreScreen.tsx | /api/v1/profiles/me/trust | 125 |

## §3 — API surface

- Web API methods: **218** (`services/web/src/lib/api.ts`, 744 lines)
- Mobile API methods: **220** (`mobile/src/lib/api.ts`, 1,234 lines) — 100% coverage + push registration (`registerDevice`)
- No method in the web client is absent from the mobile client

## §4 — Components (25)

Reused from web (translated to RN):
- ConfirmDialog, EmptyState, Skeleton, Toast, Button, MediaPicker, OtpInput, PhoneInput, ConsentBanner, CityAutocomplete, IconChipMulti, IconOptionGrid, NumberStepper, AuthOptions

New for mobile:
- PhotoUpload (expo-image-picker + FormData)
- LocationPicker (expo-location)

Ported feature-specific:
- MatchSuccessModal, MoveV2Picker, WhyCard, WeeklyTop10, TrustScoreCard, VoiceFingerprint, FamilyBrief, AllCaughtUpScreen, DeferredPileModal

## §5 — Test coverage

| Layer | Files | Purpose |
|-------|-------|---------|
| Layer 1 — Jest unit | 4 (api, stores, hooks, utils) | Pure-function verification |
| Layer 2 — RNTL component | 11 (per major screen) | Render + user-interaction verification, fetch mocked |
| Layer 3 — Contract | 7 (auth, discover, matches, messages, dtm, creativity, notifications) | Real backend at `MIAMO_API_URL`, gated on `RUN_CONTRACT_TESTS=1` |
| Layer 4 — Detox E2E | 10 spec files | Runs on Mac later — auth, discover, match, messages, dtm, creativity, settings, notifications, profile, delete-account |

## §6 — Push notifications

- Client: [mobile/src/lib/push.ts](src/lib/push.ts) via `expo-notifications`
- Registers Expo push token on cold start
- Backend: `POST /api/v1/notifications/register-device` at [services/notifications/src/server.ts:213](../services/notifications/src/server.ts) + `NotificationDevice` Prisma model
- Dispatch worker (Expo Push SDK integration): deferred — see [MOBILE.md](../MOBILE.md) §6

## §7 — Legend

- ✅ **Full** — every meaningful action in the web version has a corresponding mobile action, wired to the same API and with matching UX (loading, error, destructive confirms)
- ⚠️ **Basic** — screen exists, primary read/write flow works, but some secondary UI is simplified compared to web
- ❌ **Missing** — no screen file (parity test would fail)

**Current status: 33/33 screens Full or Basic. Zero Missing rows.** Any "Basic" row is a candidate for a post-launch polish pass but is not a launch-blocker — the core flow works.

---

_End of matrix. When adding a screen, add a row here AND add the file to `mobile/src/screens/` (or the appropriate sub-folder). The parity test asserts every row's mobile screen path exists on disk._
