# Miamo Frontend Audit

> Every page, component, hook, lib, and store file — fully read and catalogued.
> **Last Updated:** Code cleanup audit completed — dead imports removed, unused assets purged, CSS optimized.

---

## app/page.tsx (Landing Page)
- **Lines:** ~474
- **State Variables:** None (fully static)
- **API Calls:** None
- **User Actions:** Click "Start Your Story" → `/register`, Click "Already have an account" → `/login`
- **Tracking Calls:** None
- **Loading State:** None
- **Error Handling:** None
- **Empty State:** N/A (static content)
- **Bugs:**
  - None critical
- **Code Smells:**
  - Hardcoded features/testimonials/stats arrays inline — should be in constants
  - ~~Uses `APP_NAME` from constants but all other text is hardcoded~~ (FIXED: removed unused `APP_NAME` import)

---

## app/layout.tsx (Root Layout)
- **Lines:** ~42
- **State Variables:** None
- **API Calls:** None
- **User Actions:** None
- **Tracking Calls:** None
- **Loading State:** None
- **Error Handling:** None
- **Empty State:** N/A
- **Bugs:** None
- **Code Smells:** None — clean root layout

---

## app/loading.tsx (Root Loading)
- **Lines:** 11
- **Notes:** Simple `MiamoLoader` full-screen

---

## app/globals.css
- **Lines:** ~1035 (reduced from ~1170 after dead code removal)
- **Notes:** Premium CSS — glass morphism, card-3d, btn-primary/glass/ghost/outline, input-premium, nav-item, floating-hearts, shimmer-glass, heart orbit animations, orbs, badges, progress bars.
- **Removed (dead code):** `.miamo-icon-card`, `sparkle-blink`, `.text-gold`, `copper-text-shift`, `.rose-gold-border`, `.rose-gold-glow`, `.luxury-divider`, `.shadow-3d`, `.shadow-3d-hover`, `.rose-particle`, `rose-particle-float`, `.tap-glow`, `.inset-premium`, `.magnetic-hover`
- **Code Smells:**
  - Large single CSS file — could split into modules but Tailwind + PostCSS makes this acceptable
  - `.dark` mode selectors defined but dark mode not fully wired in the app

---

## app/(auth)/layout.tsx
- **Lines:** ~35
- **State Variables:** None
- **API Calls:** None
- **Notes:** Centered layout with gradient orbs, floating hearts, `AnimatedMiamoLogo`
- **Code Smells:** None

---

## app/(auth)/loading.tsx
- **Lines:** 8
- **Notes:** Simple `MiamoLoader`

---

## app/(auth)/login/page.tsx
- **Lines:** ~120
- **State Variables:** `showPassword`, `error`, `success` (useState); useForm with zodResolver
- **API Calls:** `api.login()`
- **User Actions:** Form submit, toggle password visibility, link to register
- **Tracking Calls:** None
- **Loading State:** `isSubmitting` from react-hook-form
- **Error Handling:** `error` state shown as animated div; catches login error message
- **Empty State:** N/A
- **Bugs:**
  - After successful login, `setAuth(data.user, data.token)` then navigates — if Zustand persist hasn't flushed, a race could lose auth state on slow devices
- **Code Smells:**
  - `router.push('/discover')` after 500ms `setTimeout` — fragile timing; should use router.push callback or await zustand hydration

---

## app/(auth)/register/page.tsx
- **Lines:** ~170
- **State Variables:** `showPassword`, `error`, `success`, password strength logic; useForm with zodResolver
- **API Calls:** `api.register()`
- **User Actions:** Form submit, toggle password, link to login
- **Tracking Calls:** None
- **Loading State:** `isSubmitting`
- **Error Handling:** Same pattern as login
- **Empty State:** N/A
- **Bugs:** Same race condition as login
- **Code Smells:**
  - Password strength calculation is inline — should be extracted to a utility
  - 5 strength criteria hardcoded as local array

---

## app/(main)/layout.tsx
- **Lines:** ~280
- **State Variables:** `hydrated`, `profile`, `notifCount`, `unreadMsgCount`, `msgToast`, `sideOpen`
- **API Calls:** `api.getMe()`, `api.getNotificationCount()`, `api.getChats()`, `api.logout()`
- **User Actions:** Navigate sidebar/header links, logout, dismiss toast
- **Tracking Calls:** None
- **Loading State:** `hydrated` flag gates rendering until auth store hydrates
- **Error Handling:** ErrorBoundary wraps children; API failures caught silently
- **Empty State:** Auth guard redirects to `/login` if not authenticated
- **SSE Connections:** `useSSEConnection(isAuthenticated)`, two `useSSE` handlers for `new-notification` and `new-message`
- **Bugs:**
  - `useSSEConnection` passes `isAuthenticated` from zustand, but on first render before hydration the store reads `false` — SSE won't connect until hydrated state triggers a re-render, which is correct but subtle
  - **BUG: Mobile bottom nav hardcodes 5 items while sidebar has 19** — if user expects feature parity on mobile, features are inaccessible
- **Code Smells:**
  - Lots of inline JSX for sidebar nav items — could map from `NAV_MAIN` / `NAV_SECONDARY` constants
  - `profile` fetched separately from `user` in auth store — potential for stale data if profile updates elsewhere

---

## app/(main)/loading.tsx
- **Lines:** 8
- **Notes:** Simple `MiamoLoader`

---

## app/(main)/discover/page.tsx
- **Lines:** 1175
- **State Variables:** `profiles`, `currentIndex`, `loading`, `filters`, `showFilters`, `aiData`, `activeQuickFilter`, `moveTarget`, `moveText`, `showMoveRecs` (in FilterPanel: 15+ filter fields)
- **API Calls:** `api.getDiscover()`, `api.getAiScore()`, `api.sendMiamoMove()`, `api.sendLike()`, `api.passUser()`, `api.saveDiscoverFilters()`, `api.getDiscoverFilters()`
- **User Actions:** Pass profile, send Miamo Move (with/without message), apply filters, quick filters, click AI suggestions, navigate profile photos/prompts
- **Tracking Calls:** `useTrackPageView('discover')`, `useTrackActivity()` for `view_profile`, `pass`, `like`
- **Loading State:** `ProfileCardSkeleton` component
- **Error Handling:** Silent catch on API failures; profiles set to `[]` on error
- **Empty State:** Custom empty state with "No more profiles" message and "Adjust Filters" button
- **Bugs:**
  - **BUG: `useEffect` for AI data has `[currentUser?.id]` dependency but `trackActivity` is also called inside without being in deps** — React strict mode won't cause issues but ESLint will warn
  - **BUG: `handleMove` catches `sendMiamoMove` failure and falls back to `sendLike` — but if both fail, the profile still advances.** User loses the ability to interact with that profile.
- **Code Smells:**
  - **1175 lines in a single file** — FilterPanel, ProfileCard, AiSidePanel, MoreMovesSection should be separate component files
  - `DiscoverProfile` and other types defined inline — should be in a types file
  - Partner answers in compatibility quiz are `Math.random()` — completely fake; should either be fetched from backend or clearly labeled as simulation

---

## app/(main)/matches/page.tsx
- **Lines:** 1300
- **State Variables:** `activeTab`, `matchFilter`, `searchQuery`, `incoming`, `matches`, `heldItems`, `loading`, `incomingMeta`, `selectedIncoming`, `menuOpen`, `menuPosition`, `feedbackModal`, `toast`, `selectMode`, `selectedHeldIds`
- **API Calls:** `api.getIncomingLikes()`, `api.getMatches()`, `api.matchBack()`, `api.matchBackWithMove()`, `api.holdIncoming()`, `api.resumeIncoming()`, `api.hideIncoming()`, `api.getMatchSuggestions()`, `api.favoriteMatch()`, `api.pinMatch()`, `api.unmatch()`, `api.reportMatch()`, `api.blockUser()`
- **User Actions:** 3 tabs (incoming/matches/held), match back, match with move, hold, resume, hide, favorite, pin, unmatch, report, block, search, multi-select on held tab, bulk resume
- **Tracking Calls:** None — **missing page view tracking**
- **Loading State:** `GridSkeleton`
- **Error Handling:** Most actions have empty `catch` blocks
- **Empty State:** Per-tab empty states with relevant CTAs
- **Bugs:**
  - **BUG: No `useTrackPageView('matches')` — inconsistent with other pages**
  - **BUG: `searchTimer` ref is typed `NodeJS.Timeout | null` but cleanup never clears it on unmount** — potential stale request after navigating away
  - **BUG: Context menu position uses `window.innerWidth` without SSR guard** — but since it's triggered by click event, this is safe in practice
- **Code Smells:**
  - **1300 lines in a single file** — IncomingCard, MatchCard, ContextMenu, HeldItemMenu, FeedbackModal, ProfileModal should be separate files
  - `loadData` fetches 4 endpoints in parallel but processes `heldItems` with complex merge logic that duplicates between `loadData` and the `activeTab === 'held'` effect
  - Many `any` types throughout

---

## app/(main)/messages/page.tsx
- **Lines:** 1644 (largest file)
- **State Variables:** ChatView alone has 25+ state variables. MessagesPageInner has 12+
- **API Calls:** `api.getChats()`, `api.getArchivedChats()`, `api.getChatMessages()`, `api.sendMessage()`, `api.editMessage()`, `api.deleteMessageForMe()`, `api.deleteMessageForAll()`, `api.reactToMessage()`, `api.pinChat()`, `api.muteChat()`, `api.archiveChat()`, `api.clearChat()`, `api.searchMessages()`, `api.getChatSuggestions()`, `api.checkContent()`, `api.setChatBackground()`, `api.getBeats()`, `api.completeBeat()`, `api.holdIncoming()`, `api.resumeIncoming()`, `api.unmatchByUser()`, `api.reportByUser()`, `api.blockByUser()`
- **User Actions:** Open chat, send/edit/delete message, react with emoji, reply, pin/mute/archive/clear chat, search in chat, AI suggestions, entertainment zone (Would You Rather, Truth or Dare, etc.), voice/video call UI, background picker, file attachments, beat send from chat, emoji picker, bulk select chats, report/block/unmatch via feedback modal
- **Tracking Calls:** `useTrackPageView('messages')`, `useTrackActivity()` for `open_chat`
- **Loading State:** Logo pulse animation for loading; ChatListSkeleton not used (uses inline logo)
- **Error Handling:** Silent catches; `MessagesErrorBoundary` wraps entire page; `HarshWarningModal` for content moderation
- **Empty State:** "Say hello" prompt with AI suggestions button when no messages; "Your Messages" placeholder when no chat selected
- **SSE:** `useSSE('new-message')` and `useSSE('message-sent')` for real-time updates + 30s fallback poll
- **Bugs:**
  - **BUG: Call overlay says "Audio/video calls coming soon — this is a preview" but users can still click call buttons** — confusing UX, should be disabled or clearly labeled before clicking
  - **BUG: `handleSend` checks content moderation but `handleSendWithAttachment` does NOT** — allows harsh content with attachments
  - **BUG: Voice message button sets `setMessage('[🎤 Voice message]')` as literal text** — placeholder, not real voice recording
  - **BUG: File attachments only send filename as message content, not actual file upload** — the `api.sendMessage` only sends text content, not the FormData. The attachment preview is local-only and won't persist across sessions.
  - **BUG: `setChatTheme` API is called for both theme and background changes** — API coupling
- **Code Smells:**
  - **1644 lines — needs splitting into ChatView, ChatList, MessageBubble, CallOverlay, BackgroundPicker, EntertainmentZone, etc.**
  - 8 `AnimatePresence` panels stacked at the bottom of ChatView
  - EMOJI_CATEGORIES, ENTERTAINMENT_ITEMS, SUGGESTION_CATEGORIES, REPORT_REASONS, BLOCK_REASONS, UNMATCH_REASONS all defined inline
  - ChatView has 25+ useState calls — candidate for useReducer

---

## app/(main)/beats/page.tsx
- **Lines:** 1374
- **State Variables:** `beats`, `loading`, `activeView`, `selectedBeat`, `beatEntries`, `chatFilter`, `showIceBreakers`, `confirmAction`, `celebration`, `completing`, `quickBeatType`
- **API Calls:** `api.getBeats()`, `api.completeBeat()`, `api.archiveBeat()`, `api.blockUser()`
- **User Actions:** View dashboard/sent/received, select beat match, send beat (8 types), view ice breakers, quick beat via match selector, view beat history, remove/block/report, milestone celebrations
- **Tracking Calls:** `useTrackPageView('beats')`
- **Loading State:** `GridSkeleton`
- **Error Handling:** `BeatsErrorBoundary` class component wraps page; silent catches on API
- **Empty State:** Custom empty state with "Find Matches" CTA when no beats
- **Bugs:**
  - **BUG: `getStreakDeadline()` utility function referenced but defined inline — calculates midnight of next day, but doesn't account for timezone differences between client and server**
  - **BUG: Beat entries loaded from `_events` property stored on beat objects — this is a client-side hack; should have a dedicated API endpoint**
  - **BUG: Ice breaker "onSend" callback always opens match selection modal even though the ice breaker text is never actually sent** — the text is lost when user selects a match
- **Code Smells:**
  - 1374 lines — MatchBeatsChatView, IceBreakerPanel, NudgeBar, StatCard, BeatListView should be separate files
  - `any` cast on events data: `(beats as any).find(...)`
  - Custom SVG `BeatsIcon` could be in its own file
  - Tick interval (`setInterval(() => setTick(t => t + 1), 60_000)`) forces re-render of entire page tree every minute

---

## app/(main)/stories/page.tsx
- **Lines:** 884
- **State Variables:** `storyGroups`, `myStories`, `loading`, `showCreate`, `viewingGroup`, `viewingIndex`, `hideViewed`
- **API Calls:** `api.getStories()`, `api.getMyStories()`, `api.createStory()`, `api.viewStory()`, `api.likeStory()`, `api.reactToStory()`, `api.getStoryComments()`, `api.commentOnStory()`, `api.deleteStoryComment()`, `api.postStoryToFeed()`, `api.deleteStory()`
- **User Actions:** Create story (text/photo/mood), view stories (Instagram-style), like/comment/react, delete own, post to feed, toggle hide viewed, story ring navigation
- **Tracking Calls:** None — **missing page view tracking**
- **Loading State:** `MiamoLoader`
- **Error Handling:** Silent catches
- **Empty State:** "No Stories Yet" with create CTA
- **Bugs:**
  - **BUG: No `useTrackPageView('stories')` — inconsistent**
  - **BUG: StoryViewer timer auto-advances every 5s but if comments drawer is open, story still advances** — should pause when interacting
  - **BUG: Story backgrounds are parsed from content string with regex** — fragile; should be a separate field
- **Code Smells:**
  - StoryCreateModal, CommentsDrawer, StoryViewer, MyStoryInsights all inline
  - `parseStoryContent()` and `getBackgroundGradient()` parse content strings — should be structured data

---

## app/(main)/creativity/page.tsx
- **Lines:** 1134
- **State Variables:** `activeCategory`, `items`, `loading`, `currentIndex`, `dbCategories`, `commentOpen`, `moveItem`, `moreItem`, `uploadOpen`, `showCatPicker`, `toast`
- **API Calls:** `api.getCreativityCategories()`, `api.getCreativityFeed()`, `api.createCreativityItem()`, `api.reactToCreativity()`, `api.commentOnCreativity()`, `api.getCreativityComments()`, `api.viewCreativityItem()`, `api.hideCreativityItem()`, `api.sendCreativityMove()`, `api.shareCreativityItem()`, `api.getCreativityTrends()`
- **User Actions:** Browse TikTok-style vertical scroll, like/comment/share/move, upload new content, pick category, AI hashtag suggestions, report/block/hide
- **Tracking Calls:** `useTrackPageView('creativity')`, `useTrackDwell('creativity')`
- **Loading State:** `GridSkeleton`
- **Error Handling:** Optimistic UI for likes with revert on error; toast notifications for errors
- **Empty State:** Per-category empty state with upload CTA
- **Bugs:**
  - **BUG: Like handler optimistic update has double-counting issue** — on server sync, `likeCount` calculation has a logic error where `wasLiked` and `res.data.liked` states can diverge
  - **BUG: `navigator.share` called without feature detection guard** (only checks `if (navigator.share)`, which is fine)
  - **BUG: Upload modal doesn't actually upload files to a CDN** — `mediaPreview` is a local blob URL that breaks on page refresh
- **Code Smells:**
  - 1134 lines — ReelCard, CommentSheet, MoveModal, MoreMenu, UploadModal, CategoryBar, CategoryPickerSheet all inline
  - 20 category constants defined inline

---

## app/(main)/feed/page.tsx
- **Lines:** ~180
- **State Variables:** `posts`, `loading`, `filter`, `composeText`, `composeType`, `commentMap`, `showCommentId`
- **API Calls:** `api.getFeed()`, `api.createPost()`, `api.reactToPost()`, `api.getPostComments()`, `api.commentOnPost()`, `api.deletePost()`
- **User Actions:** Create post, like, comment, bookmark (local only), share (no-op), delete, filter by type
- **Tracking Calls:** `useTrackPageView('feed')`
- **Loading State:** Simple loading check
- **Error Handling:** Silent catches
- **Empty State:** None — **if feed is empty, page shows nothing**
- **Bugs:**
  - **BUG: Bookmark is local state only** — bookmarked posts lost on refresh
  - **BUG: Share button does nothing** (no `navigator.share` or copy-link logic)
  - **BUG: No empty state** for when feed has no posts
- **Code Smells:**
  - ComposeBox and FeedPost components inline — relatively short file so acceptable

---

## app/(main)/notifications/page.tsx
- **Lines:** ~70
- **State Variables:** `notifications`, `loading`
- **API Calls:** `api.getNotifications()`, `api.markAllNotificationsRead()`, `api.markNotificationRead()`
- **User Actions:** Click notification to navigate, mark all as read
- **Tracking Calls:** None — **missing**
- **Loading State:** Simple text "Loading..."
- **Error Handling:** Silent catch
- **Empty State:** "No notifications yet" text
- **Bugs:**
  - **BUG: Filters out `message`, `media_share`, `media` types but this is hardcoded** — should be configurable
  - **BUG: Loading state is just text, not a skeleton** — inconsistent with other pages
- **Code Smells:**
  - Notification routing logic is a big switch on `type` — should use a route map

---

## app/(main)/profile/page.tsx
- **Lines:** ~170
- **State Variables:** `profile`, `loading`, `editing`, `editData`, `uploading`
- **API Calls:** `api.getMyProfile()`, `api.updateProfile()`, `api.updatePrompts()`, `api.updateInterests()`, `api.uploadPhoto(FormData)`
- **User Actions:** Edit bio/city/profession/datingIntent, upload photo, add/edit prompts, add interests, view profile score
- **Tracking Calls:** `useTrackPageView('profile')`
- **Loading State:** Simple conditional
- **Error Handling:** Silent catches
- **Empty State:** N/A
- **Bugs:**
  - **BUG: Photo upload sends `FormData` correctly but there's no progress indicator or error feedback**
  - **BUG: Profile score checklist items are hardcoded** — won't update if profile schema changes
- **Code Smells:**
  - No form validation on profile edits
  - `editData` is a flat object that could get out of sync with `profile`

---

## app/(main)/settings/page.tsx
- **Lines:** ~280
- **State Variables:** `settings`, `privacy`, `loading`, `activeSection`, `toast`, `modals` (InputModal, PasswordModal states)
- **API Calls:** `api.getSettings()`, `api.updatePrivacy()`, `api.updateSettings()`, `api.updateProfile()`, `api.updatePassword()`, `api.exportData()`, `api.deactivateAccount()`, `api.deleteAccount()`, `api.logout()`, `api.getBlockList()`, `api.unblockUser()`
- **User Actions:** Toggle 10+ privacy settings, change email/name/miamoId, change password, export data, deactivate, delete account, manage block list, toggle theme
- **Tracking Calls:** None — **missing**
- **Loading State:** Brief loading check
- **Error Handling:** Toast for successes; silent catches for failures
- **Empty State:** N/A
- **Bugs:**
  - **BUG: `deactivateAccount` and `deleteAccount` use `confirm()` browser dialog** — should use custom modal for consistency
  - **BUG: Theme toggle changes zustand store but `document.documentElement.classList` is only updated by `ThemeSync` in providers** — there can be a flash of wrong theme
- **Code Smells:**
  - Toggle component defined inline
  - 6 section tabs with content inline — could use sub-components

---

## app/(main)/search/page.tsx
- **Lines:** ~90
- **State Variables:** `query`, `results`, `loading`
- **API Calls:** `api.search()`, `api.sendLike()`
- **User Actions:** Search by name/id/city with debounce, like from results
- **Tracking Calls:** `useTrackPageView('search')`, `useTrackActivity()` for like action
- **Loading State:** Simple conditional
- **Error Handling:** Silent catch
- **Empty State:** "No results found"
- **Bugs:** None critical
- **Code Smells:**
  - Debounce timer not cleaned up on unmount

---

## app/(main)/safety/page.tsx
- **Lines:** ~100
- **State Variables:** `tips`, `reportForm`, `loading`
- **API Calls:** `api.reportUser()`, `api.getSafetyTips()`
- **User Actions:** View 8 safety cards, submit report, emergency dialer
- **Tracking Calls:** None — **missing**
- **Loading State:** None
- **Error Handling:** Silent catch
- **Empty State:** N/A
- **Bugs:**
  - **BUG: Emergency dialer uses `confirm()` then `window.open('tel:...')` — `window.open` for tel: links is unreliable; should use `window.location.href`**
- **Code Smells:**
  - 8 safety card contents hardcoded inline

---

## app/(main)/ai-match/page.tsx
- **Lines:** ~90
- **State Variables:** `suggestions`, `loading`
- **API Calls:** `api.getAiSuggestions()`, `api.sendLike()`
- **User Actions:** View AI suggestions with breakdown scores, like
- **Tracking Calls:** `useTrackPageView('ai-match')`
- **Loading State:** Simple conditional
- **Error Handling:** Silent catch
- **Empty State:** "No AI suggestions"
- **Bugs:** None critical
- **Code Smells:**
  - Breakdown score labels hardcoded inline

---

## app/(main)/videos/page.tsx
- **Lines:** ~110
- **State Variables:** `videos`, `loading`, `filter`
- **API Calls:** `api.getVideos()`, `api.reactToVideo()`, `api.commentOnVideo()`
- **User Actions:** Browse video grid, like/comment/bookmark/share, filter by category
- **Tracking Calls:** None — **missing**
- **Loading State:** Simple conditional
- **Error Handling:** Silent catch
- **Empty State:** None — **missing**
- **Bugs:**
  - **BUG: Bookmark and share are no-ops** — buttons exist but do nothing
  - **BUG: No empty state when no videos**
- **Code Smells:**
  - 7 filter categories hardcoded inline

---

## app/(main)/serious-mode/page.tsx (Date to Marry)
- **Lines:** 1474
- **State Variables:** 20+ (loading, saving, section, myProfile, browseProfiles, matches, incomingRequests, sentRequests, selectedProfile, compatData, numerologyData, dtmChats, chatMessages, filters, showFilters, bioDataStep, matchTab, etc.)
- **API Calls:** `api.getMatrimonialProfile()`, `api.updateMatrimonialProfile()`, `api.browseMatrimonial()`, `api.browseMatrimonialAdvanced()`, `api.getMatrimonialUserProfile()`, `api.getMatrimonialMatches()`, `api.getMatrimonialTemplates()`, `api.requestAccess()`, `api.getIncomingAccessRequests()`, `api.getSentAccessRequests()`, `api.handleAccessRequest()`, `api.getMatrimonialNumerology()`, `api.getMatrimonialNumerologyCompat()`, `api.getMatrimonialCompatibility()`, `api.uploadKundli()`, `api.getDtmChats()`, `api.getDtmChatMessages()`, `api.sendDtmMessage()`
- **User Actions:** 10 sidebar sections (browse/profile/matches/numerology/kundli/chat/access/preferences/privacy/templates), 6-step bio data form, browse with 16 filters, view profile detail, compatibility check (Ashtakoota + Numerology), DTM chat, access control (grant/deny/revoke), 32 bio data templates, bio data preview
- **Tracking Calls:** None — **missing**
- **Loading State:** `MiamoLoader`
- **Error Handling:** Toast messages for save results; silent catches
- **Empty State:** Per-section empty states
- **Bugs:**
  - **BUG: `Select` and `Input` and `Textarea` components are defined inline within this file** — they shadow the imported components and have different APIs (`onChange` passes value directly vs event)
  - **BUG: DTM chat has no SSE/real-time updates** — messages only update on manual navigation
  - **BUG: `profileCompletion` counts 10 fields at 10% each** — doesn't match the "60% minimum" gate if user fills 6 non-required fields
  - **BUG: Template preview renders differently per template but there's no CSS for many template IDs** — `BioDataPreview` component has limited template support
- **Code Smells:**
  - **1474 lines** — This is essentially 10 sub-pages crammed into one file. Should be split into separate route segments or at least component files
  - RELIGIONS, CASTES_BY_RELIGION, MOTHER_TONGUES, HEIGHTS, EDUCATION_LEVELS, INCOMES, etc. — massive constant arrays defined inline
  - `Field` helper component defined inline
  - `any` types everywhere

---

## app/(main)/premium/page.tsx
- **Lines:** ~70
- **State Variables:** `selectedPlan`
- **API Calls:** None
- **User Actions:** Select plan, click "Upgrade" (simulated)
- **Tracking Calls:** None — **missing**
- **Loading State:** Fake "Processing..." with setTimeout
- **Error Handling:** None
- **Empty State:** N/A
- **Bugs:**
  - **BUG: No real payment integration** — clicking upgrade just shows "Processing..." then nothing
- **Code Smells:**
  - Plans hardcoded; no backend interaction

---

## app/(main)/vibe-check/page.tsx
- **Lines:** ~500
- **State Variables:** `step`, `mood`, `energy`, `topics`, `intent`, `loading`, `saving`, `vibeHistory`, `vibeMatches`
- **API Calls:** `api.getVibeHistory()`, `api.saveVibeCheck()`, `api.getVibeMatches()`
- **User Actions:** 4-step wizard (mood → energy → topics → intent), view history, view vibe matches
- **Tracking Calls:** None — **missing**
- **Loading State:** Simple conditional
- **Error Handling:** Silent catch
- **Empty State:** "No vibe history yet"
- **Bugs:** None critical
- **Code Smells:**
  - 8 MOODS constant defined inline
  - Animated wave/particles defined inline

---

## app/(main)/date-planner/page.tsx
- **Lines:** ~500
- **State Variables:** `step`, `selectedMatch`, `vibe`, `venue`, `time`, `budget`, `activities`, `notes`, `plans`, `showCelebration`
- **API Calls:** `api.getMatches()` (to load match list only)
- **User Actions:** 5-step date creation wizard, view past plans
- **Tracking Calls:** None — **missing**
- **Loading State:** Simple conditional
- **Error Handling:** None
- **Empty State:** N/A
- **Bugs:**
  - **BUG: Plans stored in local state only** — all plans lost on page refresh
  - **BUG: No backend persistence** — this is a frontend-only feature
- **Code Smells:**
  - DATE_VIBES, VENUES, TIMES_OF_DAY, BUDGETS, FUN_ACTIVITIES hardcoded inline

---

## app/(main)/compatibility/page.tsx
- **Lines:** ~220
- **State Variables:** `matches`, `selectedMatch`, `quizActive`, `sectionIdx`, `questionIdx`, `myAnswers`, `partnerAnswers`, `showResult`, `score`, `results`
- **API Calls:** `api.getMatches()`
- **User Actions:** Select match, take 12-question quiz, view results, view past results
- **Tracking Calls:** None — **missing**
- **Loading State:** None
- **Error Handling:** Silent catch
- **Empty State:** None
- **Bugs:**
  - **BUG: Partner answers are completely random (`Math.floor(Math.random() * 4)`)** — compatibility score is meaningless/fake
  - **BUG: Score calculation uses `Math.random()` additive** — score is never deterministic
  - **BUG: Section scores shown in results are also random (`Math.round(50 + Math.random() * 45)`)** — completely fake
  - **BUG: "Share Results" button calls `resetQuiz()` instead of actually sharing**
- **Code Smells:**
  - Past results stored in local state — lost on refresh
  - No backend persistence for quiz results

---

## app/(main)/love-language/page.tsx
- **Lines:** ~220
- **State Variables:** `started`, `qIdx`, `scores`, `done`
- **API Calls:** None
- **User Actions:** Take 8-question quiz, view results with score bars/tips
- **Tracking Calls:** None — **missing**
- **Loading State:** None
- **Error Handling:** None
- **Empty State:** N/A
- **Bugs:**
  - **BUG: "Share with Match" button has empty onClick** — does nothing
  - **BUG: No backend persistence** — results lost on refresh
- **Code Smells:**
  - Entirely self-contained quiz with no API integration

---

## app/(main)/date-ideas/page.tsx
- **Lines:** ~300
- **State Variables:** `cat`, `ideas`, `expanded`, `spotlight`
- **API Calls:** None
- **User Actions:** Browse 28 date ideas, filter by category, save/unsave, random "Surprise Me", expand for details, share with match
- **Tracking Calls:** None — **missing**
- **Loading State:** None
- **Error Handling:** None
- **Empty State:** "No ideas in this category yet!"
- **Bugs:**
  - **BUG: Saved ideas stored in local state only** — lost on refresh
  - **BUG: "Share with match" button does nothing** (`onClick={e => e.stopPropagation()}`)
- **Code Smells:**
  - 28 date ideas hardcoded inline — could be fetched from backend or at least in a constants file
  - `DateIdea` type defined after the data array

---

## COMPONENTS

### components/providers.tsx
- **Lines:** ~45
- **Notes:** `QueryClientProvider` (React Query) + `ThemeSync` (dynamic import of zustand store to avoid SSR)
- **Config:** staleTime 30s, retry 2, refetchOnWindowFocus false
- **Bugs:** None
- **Code Smells:** `ThemeSync` uses dynamic import — clever but adds complexity

### components/ui/button.tsx
- **Lines:** ~55
- **Notes:** CVA-based button with variants (default/secondary/ghost/outline/danger/link) and sizes. `loading` prop adds spinner.
- **Bugs:** None
- **Code Smells:** None — well-structured

### components/ui/input.tsx
- **Lines:** ~52
- **Notes:** Forwarded ref input with label, error, icon, variant (default/glass)
- **Bugs:** None
- **Code Smells:** None

### components/ui/index.tsx (Barrel + Components)
- **Lines:** ~200
- **Notes:** Contains Avatar, Badge, Skeleton, EmptyState, Card, ScoreRing, FilterChip components
- **Bugs:**
  - **BUG: Avatar `img` has no `width`/`height` attributes** — uses CSS only, but Next.js `<img>` without dimensions can cause layout shift
  - **BUG: ScoreRing uses `React.useId()` for gradient ID** — correct approach but `useId` requires React 18+
- **Code Smells:**
  - Multiple components in one barrel file — fine for small components but some (Avatar) are 50+ lines

### components/ui/miamo-logo.tsx
- **Lines:** 280
- **Notes:** AnimatedMiamoLogo, MiamoWordmark, MiamoStaticWordmark, MiamoCompactIcon, MiamoSplash, MiamoFavicon SVG, MiamoLoader, MiamoLogo
- **Bugs:** None
- **Code Smells:**
  - Many export variants — could simplify API

### components/ui/skeleton.tsx
- **Lines:** ~140
- **Notes:** Base Skeleton + preset layouts (ProfileCardSkeleton, ChatListSkeleton, FeedSkeleton, GridSkeleton, SettingsSkeleton, NotificationsSkeleton)
- **Bugs:** None
- **Code Smells:**
  - Duplicate `Skeleton` component — also exported from `index.tsx`

### components/ui/empty-state.tsx
- **Lines:** ~42
- **Notes:** Separate EmptyState accepting `LucideIcon` type
- **Bugs:** None
- **Code Smells:**
  - Duplicate of EmptyState in `index.tsx` with slightly different API (this one takes `icon: LucideIcon`, index one takes `icon?: ReactNode`)

### components/ui/error-boundary.tsx
- **Lines:** ~70
- **Notes:** Class component with fallback prop, dev-only error message display, reset button
- **Bugs:** None
- **Code Smells:** None — clean implementation

### components/ui/modal.tsx
- **Lines:** 214
- **Notes:** Modal, InputModal, PasswordModal, Toast components
- **Bugs:**
  - **BUG: Toast auto-closes after 3s but doesn't animate exit** — `AnimatePresence` exit animation may be cut short
- **Code Smells:**
  - Toast should use a portal to avoid z-index issues

---

## HOOKS

### hooks/useSSE.ts
- **Lines:** ~115
- **Notes:** Global singleton EventSource pattern. `useSSE(eventName, handler)` subscribes to specific SSE events. `useSSEConnection(isAuthenticated)` manages lifecycle.
- **Bugs:**
  - **BUG: SSE token passed as query parameter** (`?token=...`) — security concern, token visible in server logs and browser history
  - **BUG: Reconnect timer is 3s fixed delay** — should use exponential backoff
  - **BUG: No max reconnect attempts** — will retry forever on permanent auth failure
- **Code Smells:**
  - Global mutable state (`globalSource`, `globalHandlers`, `reconnectTimer`, `currentToken`) — works but fragile in testing
  - `try { handler(data); } catch {}` silently swallows handler errors

### hooks/useTrackActivity.ts
- **Lines:** ~50
- **Notes:** `useTrackActivity()` returns fire-and-forget tracker. `useTrackPageView(page)` fires once per mount. `useTrackDwell(page)` reports time spent on unmount (only if > 2s).
- **Bugs:** None
- **Code Smells:**
  - `useTrackPageView` has `metadata` in dependency array — if caller passes inline object, it'll re-track every render. However, tracked ref prevents double-fire.

---

## LIB

### lib/api.ts
- **Lines:** ~280
- **Notes:** `ApiClient` class with ~80 API methods. Token from localStorage. Auto-clears token on 401/404. Custom `ApiError` class.
- **Bugs:**
  - **BUG: `uploadPhoto` doesn't set `Content-Type: multipart/form-data`** — browser should auto-set it with boundary, but the explicit header override in `request()` would set `Content-Type: application/json`. However, `uploadPhoto` bypasses `request()` and uses raw `fetch`, so this is actually fine.
  - **BUG: `trackActivity` is fire-and-forget with `.catch(() => {})` — if auth expires, it generates silent 401 errors that also clear the token**, potentially logging the user out unexpectedly
- **Code Smells:**
  - All return types are `any` — should have typed response interfaces
  - 80+ methods in one class — could group by domain (MatchesApi, MessagesApi, etc.)
  - No request deduplication or caching (delegated to React Query but most pages don't use it)

### lib/constants.ts
- **Lines:** ~115
- **Notes:** APP_NAME, NAV_MAIN, NAV_SECONDARY, FEATURES, INTEREST_CATEGORIES, PROFILE_PROMPTS, BEAT_STATES, RELATIONSHIP_INTENTS
- **Bugs:** None
- **Code Smells:** None — well-organized

### lib/utils.ts
- **Lines:** ~35
- **Notes:** `cn()` (clsx + twMerge), `getInitials()`, `formatRelativeTime()`, `truncate()`
- **Bugs:** None
- **Code Smells:** None — clean utilities

---

## STORES

### stores/index.ts
- **Lines:** ~75
- **Notes:** `useAuthStore` (persisted), `useThemeStore` (persisted), `useDiscoveryStore` (unused)
- **Bugs:**
  - **BUG: `useAuthStore` stores token in BOTH zustand persist AND localStorage separately** — double source of truth. `setAuth` writes to both, but `clearAuth` only removes from localStorage. If zustand persist writes back after clear, token could resurrect.
  - **BUG: `useDiscoveryStore` is defined but unused** — dead code
- **Code Smells:**
  - `user: any` type — should be typed
  - `partialize` includes `isAuthenticated` which is derived from `token !== null` — redundant

---

## CONFIG

### tailwind.config.ts
- **Lines:** 156
- **Notes:** Custom Miamo palette (pink/gold/lavender), custom gradients, shadows, animations, `tailwindcss-animate` plugin
- **Bugs:** None
- **Code Smells:** None — comprehensive theme config

### next.config.js
- **Lines:** ~14
- **Notes:** Standalone output, remote image patterns for unsplash, pravatar, dicebear
- **Bugs:** None
- **Code Smells:**
  - No other images domains configured — user-uploaded photos may fail if hosted elsewhere

### postcss.config.js
- **Lines:** ~6
- **Notes:** Standard tailwindcss + autoprefixer
- **Bugs:** None

---

## FINAL INVENTORY TABLE

| File | Lines | State Vars | API Calls | Tracking | Bugs | Severity |
|------|-------|-----------|-----------|----------|------|----------|
| app/page.tsx | 281 | 0 | 0 | ❌ | 0 | — |
| app/layout.tsx | 42 | 0 | 0 | — | 0 | — |
| app/globals.css | 540 | — | — | — | 1 | Low |
| (auth)/login/page.tsx | 120 | 3 | 1 | ❌ | 1 | Low |
| (auth)/register/page.tsx | 170 | 3 | 1 | ❌ | 1 | Low |
| (main)/layout.tsx | 280 | 6 | 4 | ✅ SSE | 1 | Med |
| (main)/discover/page.tsx | 1175 | 8 | 7 | ✅ | 2 | Med |
| (main)/matches/page.tsx | 1300 | 14 | 12 | ❌ | 3 | Med |
| (main)/messages/page.tsx | 1644 | 37+ | 25+ | ✅ | 5 | High |
| (main)/beats/page.tsx | 1374 | 11 | 4 | ✅ | 3 | Med |
| (main)/stories/page.tsx | 884 | 7 | 11 | ❌ | 3 | Med |
| (main)/creativity/page.tsx | 1134 | 11 | 12 | ✅ | 3 | Med |
| (main)/feed/page.tsx | 180 | 6 | 6 | ✅ | 3 | Med |
| (main)/notifications/page.tsx | 70 | 2 | 3 | ❌ | 2 | Low |
| (main)/profile/page.tsx | 170 | 5 | 5 | ✅ | 2 | Low |
| (main)/settings/page.tsx | 280 | 6 | 11 | ❌ | 2 | Low |
| (main)/search/page.tsx | 90 | 3 | 2 | ✅ | 0 | — |
| (main)/safety/page.tsx | 100 | 3 | 2 | ❌ | 1 | Low |
| (main)/ai-match/page.tsx | 90 | 2 | 2 | ✅ | 0 | — |
| (main)/videos/page.tsx | 110 | 3 | 3 | ❌ | 2 | Med |
| (main)/serious-mode/page.tsx | 1474 | 20+ | 18 | ❌ | 4 | High |
| (main)/premium/page.tsx | 70 | 1 | 0 | ❌ | 1 | Med |
| (main)/vibe-check/page.tsx | 500 | 9 | 3 | ❌ | 0 | — |
| (main)/date-planner/page.tsx | 500 | 10 | 1 | ❌ | 2 | Med |
| (main)/compatibility/page.tsx | 220 | 10 | 1 | ❌ | 4 | High |
| (main)/love-language/page.tsx | 220 | 4 | 0 | ❌ | 2 | Low |
| (main)/date-ideas/page.tsx | 300 | 4 | 0 | ❌ | 2 | Low |
| components/providers.tsx | 45 | 1 | 0 | — | 0 | — |
| components/ui/button.tsx | 55 | 0 | 0 | — | 0 | — |
| components/ui/input.tsx | 52 | 0 | 0 | — | 0 | — |
| components/ui/index.tsx | 200 | 1 | 0 | — | 1 | Low |
| components/ui/miamo-logo.tsx | 280 | 2 | 0 | — | 0 | — |
| components/ui/skeleton.tsx | 140 | 0 | 0 | — | 0 | — |
| components/ui/empty-state.tsx | 42 | 0 | 0 | — | 0 | — |
| components/ui/error-boundary.tsx | 70 | 1 | 0 | — | 0 | — |
| components/ui/modal.tsx | 214 | 5 | 0 | — | 1 | Low |
| hooks/useSSE.ts | 115 | 0 | 0 | — | 3 | Med |
| hooks/useTrackActivity.ts | 50 | 0 | 1 | — | 0 | — |
| lib/api.ts | 280 | 0 | 80 | — | 1 | Low |
| lib/constants.ts | 115 | 0 | 0 | — | 0 | — |
| lib/utils.ts | 35 | 0 | 0 | — | 0 | — |
| stores/index.ts | 75 | 0 | 0 | — | 2 | Med |
| tailwind.config.ts | 156 | — | — | — | 0 | — |
| next.config.js | 14 | — | — | — | 0 | — |

---

## CROSS-CUTTING ISSUES

### 1. Giant Single-File Pages
Seven pages exceed 800 lines: messages (1644), serious-mode (1474), beats (1374), matches (1300), discover (1175), creativity (1134), stories (884). Each should be split into sub-components.

### 2. Missing Page View Tracking
Pages without `useTrackPageView`: matches, stories, videos, serious-mode, premium, vibe-check, date-planner, compatibility, love-language, date-ideas, settings, safety, notifications. Only 7 of 20 pages track page views.

### 3. No TypeScript Interfaces
The entire codebase uses `any` for API responses, profile objects, match objects, etc. Zero typed response interfaces exist.

### 4. Silent Error Handling
Nearly every API call uses `.catch(() => {})` or empty catch blocks. Users get no feedback when operations fail (except messages page which has toast).

### 5. Local-Only Features
Multiple features have no backend persistence:
- Date Planner plans
- Compatibility quiz results
- Love Language quiz results
- Date Ideas saves
- Video bookmarks
- Feed bookmarks

### 6. Dark Mode Incomplete
`useThemeStore` supports dark/light/system, `ThemeSync` toggles `.dark` class, Tailwind has `darkMode: 'class'`, globals.css has some `.dark` selectors — but **zero pages use `dark:` Tailwind variants**. All pages hardcode light-mode colors.

### 7. Fake/Placeholder Features
- Premium payment is simulated
- Voice/video calls show "coming soon" overlay
- Voice messages send literal text `[🎤 Voice message]`
- Compatibility quiz partner answers are random
- File attachments don't upload to CDN

### 8. Duplicate Components
- `EmptyState` exists in both `components/ui/index.tsx` and `components/ui/empty-state.tsx` with different APIs
- `Skeleton` exists in both `components/ui/index.tsx` and `components/ui/skeleton.tsx`

### 9. SSE Security
Token passed as query parameter in SSE URL — visible in server logs, browser history, and any proxy/CDN logs.

### 10. No React Query Usage
`QueryClientProvider` is set up in providers but **no page uses `useQuery`/`useMutation`**. All data fetching is manual `useEffect` + `useState` + `api.method()`. This means no automatic caching, deduplication, retry, or background refetch.

---

**Total files audited: 42**
**Total lines of frontend code: ~13,500+**
**Total bugs identified: ~55**
**Total code smells identified: ~40+**
