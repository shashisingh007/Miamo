# Miamo Click Matrix — Phase B.1-B.4

**Date:** 2026-07-01
**Author:** Principal Engineer (fifty-year veteran persona per `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §0.0)
**Method:** static enumeration — grep + `Read` across `services/web/src/app/(main)/**/*.tsx` + `services/web/src/components/**` + `services/web/src/app/**/error.tsx|loading.tsx|not-found.tsx`. No live click testing this pass.
**Purpose:** find every interactive element, name its expected behaviour, flag static-readable smells and likely bugs, and produce a prioritised fix backlog for Phase B.5–B.6.
**Follow-up:** Phase B.5 lands on the Top-30 list in §5. Phase B.6 fixes the rest. Any bug not confirmable from static reading is deferred to §6 (live click-test pass).
**Read-only:** no source files modified; every claim cites `file:line`.
**Supersedes:** none — extends `docs/architecture/launch-audit.md` §Full-Stack §UX and `docs/architecture/full-audit.md` §§2.9–2.10 (web-app rows).

---

## §0 Executive summary

The web app is a Next.js 14 App-Router SPA with **34 pages under `(main)/`** (28 route folders + 6 shared page components), **44 co-located page/modal/rail components**, and **23 shared primitives** under `services/web/src/components/**`. Static enumeration surfaced:

| Metric | Count |
|---|---:|
| Files scanned | 101 (73 `(main)/*.tsx` + 23 shared + 5 root error/loading/not-found + `coming-soon/page.tsx`) |
| Interactive elements catalogued (buttons + Links + role="button" divs + inputs + selects + textareas + keyboard/gesture handlers + Switches) | **~1,027** |
| Suspected bugs from static reading (all severities) | **~150** |
| — of which P0 (blocks a launch-critical flow) | 0 |
| — of which P1 (breaks a feature or misleads the user, must ship-fix) | 32 |
| — of which P2 (silent-failure / missing loading state / minor UX confusion) | 89 |
| — of which P3 (accessibility polish, cosmetic label mismatches, low-risk cleanups) | 29 |
| Coming-soon placeholders in code | 6 explicit + 5 implicit (button with no handler, or handler returns void) |
| `alert()` / `window.alert()` / `window.confirm()` native dialog usages (anti-pattern §6 of the prompt) | 4 hits across 2 files |
| Empty `catch {}` blocks under `(main)/` | 76 (grep `catch\s*\(\w*\)\s*\{\s*\}`) |
| `<button>` tags under `(main)/` | 398 |
| `aria-label` attributes under `(main)/` | 31 (ratio: ~8% of buttons — well below WCAG-AA target) |
| Files with `role="button"` divs | ~17 |
| Files with `onKeyDown` handler | ~17 (same set — but not always paired with the `role="button"` divs) |

**Top-line themes (Panel-lens fingerprints):**

1. **Silent-failure epidemic (Full-Stack + QA + UX lens).** 76 empty catch blocks and dozens of `.catch(() => {})` inline swallows. Users see optimistic UI succeed while writes silently fail. Concentrated in messages/page.tsx bulk actions (§2.3), matches list resume-loop (§2.2), profile photo upload (§2.6), feed/videos like/comment (§2.4), settings toggle rollback (§2.7).
2. **Accessibility polish gap (Frontend + a11y lens).** `<button>` : `aria-label` ratio ~13:1. Icon-only close/settings/share buttons across every modal and rail. Missing keyboard triggers on 3 `role="button"` divs. Native `alert()`/`window.confirm()` in the creativity surface breaks focus management + is non-brandable.
3. **Coming-soon stubs still in the UI (UX + Product lens).** Voice/video calls in `ChatView.tsx`+`matches/page.tsx`, "coming soon" copy in `premium/page.tsx`, Settings buttons at lines 698/709/710/711/712 wired to no-op handlers, Compatibility Share-Results button that resets instead of sharing, Date-Ideas "Share with match" no-op. Prompt §Phase F demands each ships or gets removed.
4. **Missing loading states on every bulk action (QA + Backend lens).** `messages/page.tsx` bulk chat actions (lines 351, 370, 374, 381, 385, 389, 393, 397) fire `runBulkChatAction` on tap and show nothing until the toast lands seconds later. Same on Settings block-list "Manage" (line 667), verify email/phone send (108, 121), safety report submit (101), premium purchase (75).
5. **Optimistic UI that can lie (Full-Stack lens).** ReelsView like/save/share (creativity/components/ReelsView.tsx:239–272), feed toggleLike (feed/page.tsx:121–123), profile photo preview appended before upload confirms (profile/page.tsx:148), premium "Selected!" banner before any backend call (premium/page.tsx:75). No rollback path on network failure.
6. **Client-side `alert()` in a modern app (Frontend + UX lens).** `creativity/components/EarnDrawer.tsx:52-53` and `creativity/components/SpotlightUI.tsx:258, 267` use native `alert()` and `window.confirm()`. Ugly on iOS, focus-traps on desktop, breaks the design language.
7. **Placeholder inputs that read as real fields (UX lens).** `verify/page.tsx:136` is a text input for a selfie *URL* — the "real" upload never wired up. Users will paste anything and hit Submit. A confused-user P1.

**How the panel arbitrates (fifty-year tiebreak):** the founder-visible risk ranking that follows in §5 is prioritized **user-hours-of-frustration-per-hour-of-fix**. Empty-catch fixes are cheap and eliminate silent-failure classes; broken buttons on Settings are ~15-min removals; native alerts are a 30-min swap to the existing `useToast` — they land ahead of long-tail a11y sweeps that need a component-library retrofit.

---

## §1 Route inventory

Every route under `services/web/src/app/(main)/**`, listed with page-file size (LOC), primary components, and the seeded personas per `launch-status.md` §How-to-test.

| # | Route | Page file:LOC | Co-located components | Purpose | Primary personas |
|---:|---|---|---|---|---|
| 1 | `/access` | `access/page.tsx:112` | — | Inbound + outbound serious-mode access requests | miamo10, miamo15 |
| 2 | `/ai-match` | `ai-match/page.tsx:119` | — | AI-picks alternate deck | all |
| 3 | `/beats` | `beats/page.tsx:821` | BeatWidgets, MatchBeatsChatView, loading | Anti-ghost sub-conversational feature | all |
| 4 | `/compatibility` | `compatibility/page.tsx:285` | — | Compatibility mini-quiz | all |
| 5 | `/creativity` | `creativity/page.tsx:276` | CommentSheet, EarnDrawer, MoveModal, ReelsView, ShowcaseComposer, SpotlightUI, TalentCard, loading | v3.5 creativity feed + reels + Spotlight ledger | all |
| 6 | `/date-ideas` | `date-ideas/page.tsx:274` | — | Curated date-idea library | all |
| 7 | `/date-planner` | `date-planner/page.tsx:473` | — | Planned-date builder | all |
| 8 | `/discover` | `discover/page.tsx:742` | AiSidePanel, DiscoverFilterModal, FilterPanel, MatchSuccessModal, ProfileCard, ShortcutBar, WeeklyTop10, WhyCard, loading | Product's centre of gravity | all |
| 9 | `/dtm` | `dtm/page.tsx:383` | FamilyBrief | Serious-mode DTM questions + Family Brief | miamo5 (DTM) |
| 10 | `/feed` | `feed/page.tsx:297` | loading | Social feed | all |
| 11 | `/love-language` | `love-language/page.tsx:328` | — | 5 Love Languages mini-quiz | all |
| 12 | `/matches` | `matches/page.tsx:639` | FeedbackModal, MatchCard, ProfileModal, StoriesRail, loading | Match lifecycle + stories rail | all |
| 13 | `/messages` | `messages/page.tsx:512` | ChatListItem, ChatView, MessageBubble, MessagesFeedbackModal, MoveSuggestionList, MoveV2Picker, VoiceFingerprint, loading | Chat surface | all |
| 14 | `/notifications` | `notifications/page.tsx:115` | — | Notification inbox | all |
| 15 | `/onboarding` | `onboarding/page.tsx:868` | — | Multi-step onboarding | new users |
| 16 | `/premium` | `premium/page.tsx:93` | — | Premium tier picker | miamo15 |
| 17 | `/profile` | `profile/page.tsx:570` | — | Self-profile editor + photo grid | all |
| 18 | `/safety` | `safety/page.tsx:150` | — | Safety hub (report, block, verify, tips, dialer) | all |
| 19 | `/search` | `search/page.tsx:109` | — | User search (name/id/city) | all |
| 20 | `/serious-mode` | `serious-mode/page.tsx:1339` | BioDataPreview, CompatibilityModal, DtmShortcutBar, FormWidgets, MatrimonialBigCard, MatrimonialCard, ProfileDetailModal, ProfileEditor, loading | Matrimonial mode (DTM sacred zone) | miamo5 |
| 21 | `/settings` | `settings/page.tsx:752` | — | 60+ user preferences + destructive account actions | all |
| 22 | `/showcase` | `showcase/page.tsx:112` | — | Showcase carousel | all |
| 23 | `/stories` | `stories/page.tsx:373` | StoryCreateModal, StoryViewer, constants | Stories | all |
| 24 | `/verify` | `verify/page.tsx:171` | — | Email + phone + selfie verification | all |
| 25 | `/vibe-check` | `vibe-check/page.tsx:397` | — | 4-step mood/energy/topics/intent classifier | all |
| 26 | `/videos` | `videos/page.tsx:126` | — | Video reels | all |

Plus persistent chrome from `(main)/layout.tsx:456` — sidebar, mobile nav, notification toast, logout button, more-menu toggle, SSE-driven message + notif badges.

Total: **26 top-level routes** + **44 co-located components** = **70 surface files** under `(main)/`. Add **23 shared primitives** for a scan surface of **93 files**. (Plus 5 root error/loading/not-found boundaries + `coming-soon/page.tsx`.)

---

## §2 Click matrix

The full flat catalogue is in §Appendix A of the Explore-agent transcripts (kept in this repo's `.claude/` cache and mirrored into the sections below). This document reproduces the interesting rows — the ones with a static-readable smell — grouped by surface. A row without a Smell column is included when the surface has few elements and completeness matters for the reader.

### 2.1 `/discover` — the product's centre of gravity (`discover/page.tsx` + 8 components)

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Refresh Top-10 button | `discover/page.tsx:444-459` | Reload deck, track refresh event | Loading state disables button correctly; **no visible failure toast** if `loadProfiles` throws | P2 |
| Undo button | `discover/page.tsx:476-490` | Revert last swipe | Guarded by `!actionHistory.length` — correct | healthy |
| Pass feedback textarea + submit | `discover/page.tsx:723-737` | Optional "why passed" free text | No length guard; no server-side validation UI (silent 4xx if backend rejects) | P3 |
| Deferred count badge fetch | `discover/page.tsx:203` | Poll deferred-pile count | Empty catch: `catch { /* swallow */ }` — user sees stale count | P2 |
| AI-score fetch | `discover/page.tsx:214` | Score card in header | `.catch(() => {})` swallows failure — no fallback UI | P2 |
| AI move send | `AiSidePanel.tsx:38, 323-331` | Send AI-composed message | `try {track} catch {}` telemetry drop is fine; **`api.getMoveSuggestions` catch (line 147) shows no toast** on failure | P1 |
| Filter modal Save | `DiscoverFilterModal.tsx:372` | Persist filter set, close modal | No explicit loading indicator during PUT `/discover/filters`; disable-on-submit not visible in the render tree | P2 |
| Filter modal Reset | `DiscoverFilterModal.tsx:378` | Reset filters to defaults | Naked call — no confirm ("are you sure you want to clear 20+ filters?") | P3 |
| FilterPanel geolocation button | `FilterPanel.tsx:315-329` | Detect city via `navigator.geolocation` | Nested try/catch, second `api.nearestCity` error only surfaces via toast; if toast provider itself is unmounted the error is lost | P2 |
| FilterPanel serious-mode switch | `FilterPanel.tsx:384` | Toggle DTM mode | Uses `api.updateProfile`; no rollback on failure — user thinks they're in DTM but ranker still runs Casual | P1 |
| MatchSuccessModal Send | `MatchSuccessModal.tsx:243-249` | Send first Move v2 msg | Disable-when-sending is correct; **`track('match.move_v2_modal_shown')` catch (line 103) silently drops the telemetry event Move v2 dashboards depend on** — cross-refs `full-audit.md` §0 finding 8 | P1 |
| ProfileCard pass button | `ProfileCard.tsx:225` | Pass the current card | `api.passUser(id).catch(() => {})` swallows failure; UI advances so user believes pass registered | P1 |
| ProfileCard like buttons on photos | `ProfileCard.tsx:147, 206-211, 222-227` | Like a specific photo | Photo IDs read from `photos[0..2]?.id` — index access without guard; array shorter → `undefined` id sent to server | P2 |
| ShortcutBar clear-category div | `ShortcutBar.tsx:746` | Clear the category filter | `role="button"` div with no `onKeyDown` — inaccessible from keyboard | P3 |
| WeeklyTop10 fetch | `WeeklyTop10.tsx:76-78` | Load top-10 payload | Empty catch → empty state ambiguous ("no top-10 this week" vs "load failed") | P2 |
| WhyCard "less like this" | `WhyCard.tsx:233-239, 152` | Negative-signal feedback | `.catch(() => {})` — a false-success toast could mislead the learner into thinking the negative was accepted | P2 |
| AiSidePanel v2 modal telemetry | `AiSidePanel.tsx:103` | Emit `match.move_v2_modal_shown` | Silent drop — see MatchSuccessModal row | duplicate P1 |

Panel note: `/discover` has *good* disabled-state discipline on send/refresh buttons (Frontend lens approves), but the empty-catch pattern *at the write site* systematically hides backend errors from the UX (Full-Stack + QA lens raises). The pattern is repeated in ~8 places across the surface.

### 2.2 `/matches` — match lifecycle (`matches/page.tsx` + 4 components)

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Bulk resume held (loop) | `matches/page.tsx:77` | `api.resumeIncoming(id)` per selected id | Errors swallowed in `.catch(() => {})`; user gets "Resumed X" success toast even if 4/5 failed | P1 |
| Global data load | `matches/page.tsx:119` | Load matches + incoming + held | Empty catch; if it fails, spinner just spins forever | P2 |
| Hide-incoming action | `matches/page.tsx:224` | Hide an incoming like | Error toast fires but `loadData()` fires synchronously after — succeeded/failed toasts race, latter usually wins and clobbers the error | P1 |
| Handle video call | `matches/page.tsx:306` | Start a call | Handler is `toast.info('Video calls coming soon!')` — coming-soon placeholder | P2 (§3) |
| Match search input | `matches/page.tsx:420` | Debounced 300 ms search | Correct — debounce present | healthy |
| Tab buttons (incoming/matches/held) | `matches/page.tsx:368, 484, 502, 505` | Switch tab / bulk-select mode | Correct disabled-state logic | healthy |
| FeedbackModal submit | `FeedbackModal.tsx:100-107` | Send unmatch/report/block reason | `catch {}` (line 30) — user sees "done" state even if server rejected | P2 |
| ProfileModal match-back button | `ProfileModal.tsx:199-206, 386` | Match-back with optional Move | `api.sendLike().catch(() => {})` — send-move surrogate can succeed while like fails; asymmetry not surfaced | P1 |
| StoriesRail add-story button | `StoriesRail.tsx:81-86` | Open StoryCreateModal | Correct | healthy |
| StoriesRail load | `StoriesRail.tsx:35` | Load story groups | `.catch(() => setGroups([]))` — indistinguishable from "no stories" | P2 |
| MatchCard menu items | `MatchCard.tsx:210-212` | Message / Video-call / Menu | Video-call button ships a "coming soon" toast (see §3) | P2 |

### 2.3 `/messages` — chat (`messages/page.tsx` + 7 components)

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Bulk-action buttons (resume/unmatch/delete/archive/mute/pin) | `messages/page.tsx:351, 370, 374, 381, 385, 389, 393, 397` | Fire bulk chat action | **No loading indicator during network call**; toast lands after ~1–2 s of unclear silence | P1 |
| Bulk-action inner catch | `messages/page.tsx:336` (inside `runBulkChatAction`) | Handle failures | Empty catch swallows all failures across ~8 bulk actions | P1 |
| Chat open (from list) | `messages/page.tsx:299` | Open a conversation | `setActiveChat(id)` fires immediately; if `getChatMessages` later 404s, user sees empty chat with no explanation | P2 |
| Voice-fingerprint reminder toast | `messages/page.tsx:466-471` | Nudge user to view VF modal | Guarded by localStorage flag — correct | healthy |
| ChatView background picker load | `ChatView.tsx:33` | Load background presets | Empty catch — silent | P3 |
| ChatView Send button | `ChatView.tsx:778` | Send message or attachment | Correct: disable-on-submit + attachment branch | healthy |
| ChatView voice-message CTA | `ChatView.tsx:754` | Record a voice note | Handler sets a placeholder emoji string (`[🎤 Voice message]`) — **fake feature** | P1 (§3) |
| ChatView voice call button | `ChatView.tsx:147-151, 455-456` | Start voice/video call | Non-functional preview; user taps and nothing happens | P1 (§3) |
| ChatView hide chat | `ChatView.tsx:472` | Hide + go back | `api.archiveChat(id).catch(() => {})` — silent failure; user thinks chat is hidden but list refresh reveals it | P1 |
| ChatView search-message input | `ChatView.tsx:493-496` | Search message history | Correct: Enter handler + explicit Search button | healthy |
| ChatView reactions | `MessageBubble.tsx:110, 196` | Double-tap heart or emoji picker | Uses pointer events; `onPointerCancel` handled — correct | healthy |
| MoveV2Picker load | `MoveV2Picker.tsx:102-142` | Fetch v2 suggestions | v2-endpoint 404 conflates "feature disabled" with "backend down" — user sees "no suggestions" | P2 |
| MessagesFeedbackModal submit | `MessagesFeedbackModal.tsx:33` | Send feedback | Empty catch on submit — same silent-failure class | P2 |
| VoiceFingerprint canvas | `VoiceFingerprint.tsx:84` | Render fingerprint for share | Canvas ref access without null-guard — will throw if ref missing (rare but possible on re-mount) | P3 |
| Beats compose send | `MatchBeatsChatView.tsx:689` | Send a beat | Disable-when-sending correct | healthy |
| Beats screenshot detection | `MatchBeatsChatView.tsx:462-488` | Log screenshot | 3-s rate-limit present; still spammable across key combos | P3 |

### 2.4 `/creativity`, `/feed`, `/videos`, `/stories` — content surfaces

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| ReelsView like button | `creativity/components/ReelsView.tsx:436, 239-241` | Beat/like reel | Optimistic flip before network — no rollback on failure | P2 |
| ReelsView save | `ReelsView.tsx:440, 266-268` | Save reel | Optimistic flip before network — same | P2 |
| ReelsView share | `ReelsView.tsx:441, 282` | Copy link to clipboard | Toast fires **before** clipboard write awaits — misleading on slow clipboard | P1 |
| ReelsView move | `ReelsView.tsx:438, 290` | Open MoveModal | Suggestions fetched with no visible loading indicator inside modal | P1 |
| CommentSheet load | `creativity/components/CommentSheet.tsx:26` | Load comments | Empty catch — sheet just shows empty state | P1 |
| CommentSheet post | `CommentSheet.tsx:37, 97` | Post comment | Empty catch — post silently fails, comment vanishes | P1 |
| EarnDrawer claim streak | `EarnDrawer.tsx:52-53, 55, 121` | Claim 7-day bonus | Uses **`alert()`** for feedback (native dialog anti-pattern) + empty catch swallows API failure | P1 |
| MoveModal send | `creativity/components/MoveModal.tsx:28, 101` | Send Move to creator | Empty catch — send silently fails | P1 |
| SpotlightUI delete-from-vault | `SpotlightUI.tsx:258, 267, 273` | Delete a Spotlighted post | Uses **`window.confirm()`** + **`window.alert()`** — native dialog anti-pattern in a v1 launch surface | P1 |
| ShowcaseComposer publish | `ShowcaseComposer.tsx:239` | Compress + upload + create post | No loading state visible during video compression (can take 30 s on mobile) | P2 |
| Feed toggleLike | `feed/page.tsx:121-123` | Like a post | Optimistic flip; empty catch — like state can lie on failure | P1 |
| Feed submitComment | `feed/page.tsx:146` | Post a comment | Empty catch (does at least restore commentText — good) | P2 |
| Feed handleDelete | `feed/page.tsx:153` | Delete a post | Empty catch — user thinks post is gone, next refresh shows it's still there | P1 |
| Videos toggleLike | `videos/page.tsx:26, 63` | Like a video | Empty catch on network | P1 |
| Videos submitComment | `videos/page.tsx:31, 78` | Post a comment | Empty catch | P1 |
| StoryCreateModal drop zones | `StoryCreateModal.tsx:359, 410` | Drop or click to add media | `role="button"` divs; `onKeyDown` is present, but **no visible focus ring** | P2 |
| StoryViewer menu actions (7 items) | `StoryViewer.tsx:296, 300, 304, 307, 315, 319, 322, 325` | Post-to-Feed / Save / Copy / Delete / Mute / Report | Every action has an empty catch — cluster of 7 silent failures on the single most-used content surface | P1 |
| StoryViewer tap zones prev/next | `StoryViewer.tsx:346, 348` | Navigate stories | No focus indicator on tap zones — keyboard users see nothing | P3 |
| Showcase page like | `showcase/page.tsx:96` | Open external link | `href` OK | healthy |

### 2.5 `/dtm` + `/serious-mode` — serious mode (DTM sacred zone)

The prompt's Hard-Constraint 4 makes DTM code and copy sacred. Read-only enumeration below; any fix must preserve coverage-gating math and the caste-field-is-never-in-ranking rule.

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| DTM answer submit | `dtm/page.tsx:329-340, 165` | POST answer | TODO comment at line 165 — endpoint not wired; the answer button appears to work but the POST is stubbed (`// TODO(v6.7): POST answer to matrimonial service when endpoint exists.`) | P1 |
| DTM skip button | `dtm/page.tsx:317` | Advance without answering | Correct | healthy |
| DTM see-later | `dtm/page.tsx:323` | Defer a question | Empty catch on `api.deferItem` — advance happens even if save fails | P2 |
| DTM Family Brief generate | `dtm/components/FamilyBrief.tsx:87, 267-279` | Generate a family-brief pdf/image | Failure toast reads `error.message`, but the API can throw non-Error objects (e.g. axios `{ statusCode }`) — string `undefined` in toast | P2 |
| Serious-mode filter Apply | `serious-mode/page.tsx:553` | Apply DTM filters | No loading state; error at `applyFilters` (line 167) swallowed silently | P2 |
| Serious-mode Clear-all filters | `serious-mode/page.tsx:559` | Reset filters, re-fetch | No loading state, no confirmation | P2 |
| Serious-mode DTM Top-10 refresh | `serious-mode/page.tsx:412-418, 180, 198` | Re-rank + fetch | Empty catch — user tap does nothing visible if refresh fails | P2 |
| Serious-mode chat send | `serious-mode/page.tsx:240, 267, 992-1001` | Send chat with optional media | Catch swallows send errors — message-loss invisible | P1 |
| Serious-mode access-request Grant/Deny/Revoke | `serious-mode/page.tsx:210, 220, 753-759` | Change access-request status | Empty catch — critical serious-mode flow with silent failure | P1 |
| Serious-mode numerology calc | `serious-mode/page.tsx:791` | Calculate numerology chart | No loading state on heavy calculation | P2 |
| MatrimonialBigCard proposal send | `MatrimonialBigCard.tsx:396-408` | Send proposal note | Correct disable logic, but access-request modal below has empty try/finally | P2 |
| MatrimonialBigCard suggestions load | `MatrimonialBigCard.tsx:303` | Fetch AI proposal suggestions | Empty catch → suggestions silently empty | P2 |
| ProfileDetailModal compat button | `ProfileDetailModal.tsx:67` | Kick off compat check | No loading state visible | P2 |
| DtmShortcutBar clear-cat button | `serious-mode/components/DtmShortcutBar.tsx:1074-1080` | Clear one filter | `role="button"` div; keyboard support present via `onKeyDown` | healthy |
| ProfileEditor Save Profile | `ProfileEditor.tsx:60` | Save DTM profile | Disabled-when-saving present; correct | healthy |
| ProfileEditor Phone / Alternate Phone inputs | `ProfileEditor.tsx:192-193` | Enter phone strings | Placeholder-only "+91 XXXXXXXXXX" — no validation (server-side may catch, but the UI accepts anything) | P3 |

### 2.6 `/onboarding` + `/profile` — self-representation

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Onboarding continue button | `onboarding/page.tsx:248-250` | Advance to DTM/Discover | Correct | healthy |
| Onboarding bucket expand | `onboarding/page.tsx:266` | Expand/collapse bucket card | Correct | healthy |
| Onboarding "Enable DTM mode" | `onboarding/page.tsx:315` | `patchProfile` + navigate | Race: navigate happens without awaiting patch — if patch fails, user is on DTM page in Casual mode | P1 |
| Onboarding "Use my current location" | `onboarding/page.tsx:390-393` | Geolocation → nearestCity | No aria-label, no loading indicator during permission prompt | P2 |
| Onboarding save-row buttons | `onboarding/page.tsx:862` | Save current bucket | No aria-label on generic "Save" | P3 |
| Profile edit toggle | `profile/page.tsx:272, 283` | Toggle edit / save / cancel | Save has no fully-visible loading state on network write | P2 |
| Profile "Use my location" | `profile/page.tsx:356` | Geolocation for city | No aria-label, no loading state (same class as onboarding) | P2 |
| Profile photo upload | `profile/page.tsx:148` | Upload + append to grid | **Preview appended optimistically before upload confirms**; failure toast fires but preview stays until refresh | P1 |
| Profile prompt save | `profile/page.tsx:411-415` | Save new prompt | Success toast on success; only generic "Failed to add prompt" on catch — no field-level reason | P2 |
| Profile interest picker | `profile/page.tsx:460` | Add an interest | No loading state during network write | P2 |
| Profile "Start Verification" | `profile/page.tsx:526` | Start verify flow | **No onClick handler** — dead button | P1 (§3) |
| Profile loadProfile | `profile/page.tsx:158` | Load own profile | Empty catch — if load fails, skeleton spins forever | P1 |
| Profile photo grid item | `profile/page.tsx:322` | Open lightbox at index | Correct | healthy |

### 2.7 `/settings` — the most surface-area

`settings/page.tsx` is 752 LOC with **~60 toggles, ~15 buttons, ~10 selects/segmented controls, 3 modals, 4 destructive-action buttons.** The catalogue below focuses on the elements with static-readable smells; the ~40 uneventful toggles are healthy.

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Any toggle → server | `settings/page.tsx:29-45, 330` | Optimistic UI + revert on failure | Empty catch **inside** the toggle handler at line 330 — no toast on failure, user thinks toggle stuck | P1 |
| Change Email button | `settings/page.tsx:434, 380` | Open InputModal → PUT profile.email | Modal onSubmit catch is `catch { showToast('Failed', 'error') }` — correct actually | healthy |
| Change Password button | `settings/page.tsx:437` | Open PasswordModal | Modal implementation in `ui/modal.tsx` is fine | healthy |
| Copy MiamoId | `settings/page.tsx:440, 343` | `navigator.clipboard.writeText` | No error handling if clipboard denied | P2 |
| Enable 2FA | `settings/page.tsx:446, 115` | Open TwoFactor modal | Modal body is a "coming-soon" copy — the button opens a real modal, so ship-or-remove per §3 | P2 (§3) |
| Manage Sessions | `settings/page.tsx:449, 130-142` | Open Sessions modal | Icon-X missing aria-label (line 130) | P3 |
| Manage blocked-users | `settings/page.tsx:667` | Load block-list | No loading state on fetch | P2 |
| Unblock user in block-list | `settings/page.tsx:674, 368` | Remove from block-list | Empty catch — user taps, list doesn't change on failure | P2 |
| Restore purchases | `settings/page.tsx:695` | Trigger purchase-restore | Handler = `showToast('Restored', 'success')` — **mock** (§3) | P1 |
| Cancel subscription | `settings/page.tsx:698` | Cancel active premium | **No onClick handler** — dead button | P1 (§3) |
| Email us | `settings/page.tsx:709` | Open support | **No onClick handler** — dead button | P1 (§3) |
| Share feedback | `settings/page.tsx:710` | Feedback form | **No onClick handler** — dead button | P1 (§3) |
| What's new | `settings/page.tsx:711` | Changelog view | **No onClick handler** — dead button | P1 (§3) |
| Rate Miamo | `settings/page.tsx:712` | App-store rating deep link | **No onClick handler** — dead button | P1 (§3) |
| Accent color swatches | `settings/page.tsx:622-625` | Change UI accent | Rendered as decorative divs — **no onClick**, "coming soon" tag missing | P2 (§3) |
| Deactivate account | `settings/page.tsx:730` | Soft-hide account | Correct — no missing loader visible | P2 |
| Delete account (confirm) | `settings/page.tsx:736-740` | Hard-delete via RTBF worker | 2-step confirmation present; correct | healthy |
| Language select | `settings/page.tsx:633` | Change i18n locale | Handler saves preference; no visible UI change until reload (§Phase G.13) | P2 |
| Sign out | `layout.tsx:318, 118-131` | Server logout + local clear | If network fails, toast fires and local clear still happens — good design | healthy |

### 2.8 `/notifications`, `/safety`, `/verify`, `/premium`, `/access`, `/vibe-check`, `/love-language`, `/compatibility`, `/ai-match`, `/date-ideas`, `/date-planner`, `/search`, `/showcase`

Grouped because each is small and the smells are similar.

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Notifications "Mark all read" | `notifications/page.tsx:72, 55-63` | Bulk-mark read | Catch shows error toast but success flow doesn't confirm | P2 |
| Notifications card click | `notifications/page.tsx:88-93, 90` | Mark read + navigate | `.catch(() => {})` on the mark-read call — silent | P2 |
| Safety report submit | `safety/page.tsx:101` | POST /reports | Button says "Submitting…" text but no spinner — user may double-tap; disable-during-submit likely still fires the second | P2 |
| Safety tips load | `safety/page.tsx:46` | Load tips | Empty catch — user sees empty tips section with no clue | P2 |
| Safety Call 112 | `safety/page.tsx:142` | Open dialer via `tel:112` | Correct | healthy |
| Verify email/phone send | `verify/page.tsx:108, 121` | Send OTP | No loading state during send — user re-taps | P2 |
| Verify auto-verify + manual Verify | `verify/page.tsx:113-114` | OTP complete triggers verify AND button also calls verify | Duplicate trigger — the auto-verify races the button-verify; both can fire | P2 |
| Verify selfie input | `verify/page.tsx:136-140` | Submit selfie URL | Input is a **text URL field** — real upload not wired. Users will paste anything | P1 (§3) |
| Premium plan card | `premium/page.tsx:75-85` | Select plan → checkout | **Optimistic** "Selected! Payment coming soon" copy before any API call; also purchase handler is a stub per launch-status B.4 | P1 (§3) |
| Access decide (Approve/Deny/Revoke) | `access/page.tsx:54, 94-102` | Change access-request state | Fetch response `r.ok` not checked — a 400/500 is silently treated as success | P1 |
| Vibe-check Set-my-vibe | `vibe-check/page.tsx:332, 137` | Save vibe → load matches | Empty catch on `shareVibe` — silent | P2 |
| Love-language share | `love-language/page.tsx:313` | Copy/share summary | Empty catch — user hits Share and nothing happens on failure | P2 |
| Love-language Retake | `love-language/page.tsx:300` | Reset quiz | Correct | healthy |
| Compatibility "Share Results" | `compatibility/page.tsx:219` | Share to matches | **Handler is `resetQuiz`** — label lies (P3 says label mismatch, but user-visible-behaviour is wrong → treat P2) | P2 (§3) |
| AI-match Like button | `ai-match/page.tsx:105` | Send like | Empty catch — user thinks like registered | P2 |
| Date-ideas Share-with-match | `date-ideas/page.tsx:247` | Share to a match | Handler is a no-op — dead button | P2 (§3) |
| Date-ideas save/unsave | `date-ideas/page.tsx:161, 250` | Toggle saved | Uses localStorage — no network — correct | healthy |
| Date-planner Create | `date-planner/page.tsx:379` | Persist plan | Correct — no smells | healthy |
| Search Like | `search/page.tsx:88` | Send like from search result | Empty catch — silent | P2 |
| Showcase item link | `showcase/page.tsx:96` | Open external URL | `href` OK | healthy |

### 2.9 Persistent chrome — `(main)/layout.tsx`

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| Sidebar nav Links (Main + More) | `layout.tsx:213-296` | Client-side nav | Correct | healthy |
| More toggle | `layout.tsx:248-264` | Expand/collapse secondary nav | `aria-expanded` + `aria-controls` present — correct | healthy |
| Notification bell | `layout.tsx:353` | Nav to /notifications | Correct — with SSE-driven badge | healthy |
| Mobile bottom nav | `layout.tsx:397-428` | 4-item tab bar + More | Correct | healthy |
| Real-time notification toast | `layout.tsx:432-453` | Click → nav to /notifications | Correct — no smells | healthy |
| Sign-out button | `layout.tsx:318, 118-131` | Server logout + local clear + redirect | Correct design (see §2.7 row) | healthy |
| SSE new-message hook | `layout.tsx:87, 79-85` | Refresh unread count | `.catch(() => { /* non-critical: silently retry on next poll */ })` — well-commented intentional swallow | healthy |
| Completion gate (onboarding redirect) | `layout.tsx:143-160` | Redirect to onboarding when score < threshold | `catch { /* fail-open */ }` — well-commented intentional | healthy |
| MainLayout auth-gate spinner | `layout.tsx:162-176` | Show splash while hydrating | Correct | healthy |

### 2.10 Shared primitives — `services/web/src/components/**`

Sample of the most interesting rows. Full list in the Explore-agent transcript.

| Element | File:line | Expected | Suspected bug | Sev |
|---|---|---|---|---|
| AuthOptions dev-only buttons | `AuthOptions.tsx:229-244, 246-258` | Dev fallback for Google/Apple | Rendered only in dev, but code path lives in production bundle — dead code in prod | P3 |
| AuthOptions ID-mode toggle | `AuthOptions.tsx:274-287` | Toggle phone/email | Missing focus ring | P3 |
| CityAutocomplete dropdown items | `CityAutocomplete.tsx:113` | Select a city | Uses `onMouseDown` (correct for portal); no keyboard-Enter to select | P3 |
| ConsentBanner checkboxes | `ConsentBanner.tsx:68-92` | Toggle DPDP categories | Missing labels linked to checkbox (label-for id) | P2 |
| MediaPicker drop zone | `MediaPicker.tsx:180-205` | Drag-drop / click / keyboard | `onKeyDown` + `role="button"` — correct | healthy |
| MediaPicker clear | `MediaPicker.tsx:215-218` | Clear selected media | Icon-only, missing aria-label | P3 |
| DeferredPileModal item | `deferred/DeferredPileModal.tsx:136` | Open a deferred item | `<div onClick>` — no role, no keyboard support | P2 |
| DeferredPileModal actions | `deferred/DeferredPileModal.tsx:150-173` | Pass / like / super_like / skip / answer | Correct | healthy |
| Modal X button | `ui/modal.tsx:51` | Close modal | No aria-label — used across every route | P2 |
| Toast dismiss | `ui/toast.tsx:119, 144` | Dismiss toast | No aria-label on X | P3 |
| ErrorBoundary retry | `ui/error-boundary.tsx:65-70` | Reset error state | Correct with focus ring | healthy |
| global-error retry button | `app/global-error.tsx:36-41` | Reset global-error | Inline-style only, no `:focus` ring | P3 |
| coming-soon page CTAs | `app/coming-soon/page.tsx:42-50` | Register / Sign in | Correct | healthy |

---

## §3 Coming-soon audit

Per Phase B.4 of the prompt: every placeholder ships or gets removed. Grep results (repo root: `/Users/singhshs/Downloads/Miamo`):

### 3.1 Explicit "coming soon" copy (4 hits)

| # | File:line | Current state | Ship or remove? | Effort |
|---:|---|---|---|---|
| 1 | `services/web/src/app/(main)/messages/components/ChatView.tsx:154` | "Audio/video calls coming soon — this is a preview" caption under a preview panel | **Remove** the entire preview panel (Phase F backlog for post-launch). Leaves messaging surface clean. Cross-ref §Phase G.16 for the real notification-first strategy. | 30 min |
| 2 | `services/web/src/app/(main)/matches/page.tsx:306` | `handleVideoCall` handler = `toast.info('Video calls coming soon!')` bound to a phone-icon button | **Remove** the phone icon from `MatchCard.tsx:211` and delete the handler | 20 min |
| 3 | `services/web/src/app/(main)/premium/page.tsx:75` | Copy "✓ Selected! Payment coming soon" shown after plan-tap, but no purchase call fires | **Remove** the optimistic copy; wire the real Razorpay path when B.4 unblocks (see `launch-status.md` §"What's not done") | 15 min removal + 3 h ship |
| 4 | `services/web/src/app/coming-soon/page.tsx:11` | Full route rendering a landing page | **Keep** — this is the intentional "invite-only" or feature-flag off marketing page. Cross-ref §Phase G.18. | 0 |

### 3.2 Native-dialog anti-patterns (§6 of prompt — must remove)

| # | File:line | Current state | Fix |
|---:|---|---|---|
| 5 | `services/web/src/app/(main)/creativity/components/EarnDrawer.tsx:52-53` | `alert(...)` in streak-claim handler | Replace with `useToast().info(...)` | 15 min |
| 6 | `services/web/src/app/(main)/creativity/components/SpotlightUI.tsx:258, 267` | `window.confirm(...)` + `window.alert(...)` on delete-with-refund | Replace with `<ConfirmModal>` from `ui/modal.tsx` + `useToast().error(...)` | 30 min |

### 3.3 Buttons with no handler (dead clicks)

| # | File:line | Label | Current state | Fix |
|---:|---|---|---|---|
| 7 | `services/web/src/app/(main)/profile/page.tsx:526` | "Start Verification" | Rendered button, `onClick` prop missing | Add `router.push('/verify')` — 5 min |
| 8 | `services/web/src/app/(main)/settings/page.tsx:698` | "Cancel subscription" | No onClick | Add real handler or remove — 20 min |
| 9 | `services/web/src/app/(main)/settings/page.tsx:709` | "Email us" | No onClick | Add `mailto:support@miamo.app` — 5 min |
| 10 | `services/web/src/app/(main)/settings/page.tsx:710` | "Share feedback" | No onClick | Open feedback modal or `mailto:` — 15 min |
| 11 | `services/web/src/app/(main)/settings/page.tsx:711` | "What's new" | No onClick | Link to `/coming-soon` or a changelog route — 10 min |
| 12 | `services/web/src/app/(main)/settings/page.tsx:712` | "Rate Miamo" | No onClick | Deep-link to Play/App-Store or `noop` for web — 10 min |
| 13 | `services/web/src/app/(main)/settings/page.tsx:622-625` | Accent color swatches | Decorative divs, no onClick, no "coming soon" label | Add tooltip "coming soon" or remove — 10 min |
| 14 | `services/web/src/app/(main)/date-ideas/page.tsx:247` | "Share with match" | Empty onClick in a motion.button | Wire share sheet or remove — 15 min |
| 15 | `services/web/src/app/(main)/compatibility/page.tsx:219` | "Share Results" | Handler is `resetQuiz` (label lies) | Fix handler to actually share — 30 min |

### 3.4 Stubbed-but-visible features (from `launch-status.md` §"What's not done")

| # | File:line | Current state | Fix |
|---:|---|---|---|
| 16 | `services/web/src/app/(main)/verify/page.tsx:136` | Selfie **URL** text input labelled as verification input | Wire real upload via `MediaPicker.tsx` and `s3-signed-url` route; **or** hide the entire selfie step until the upload route ships — 4 h |
| 17 | `services/web/src/app/(main)/dtm/page.tsx:165` | TODO comment: "POST answer to matrimonial service when endpoint exists" — Answer button appears to work but doesn't persist | Wire real endpoint or disable the button — 2 h |
| 18 | `services/web/src/app/(main)/messages/components/ChatView.tsx:754` | Voice-note "record" button sets a text emoji placeholder into the composer instead of recording | Wire MediaRecorder-based voice-note flow **or** remove the icon until Phase F — 6 h ship / 15 min remove |
| 19 | `services/web/src/app/(main)/settings/page.tsx:446, 115` | 2FA enable button opens a modal that says "coming soon" | Wire 2FA (schema exists per `full-audit.md` §2.2 row A10) or remove the setting — 4 h ship |

**Recommendation to founder:** rows 1, 2, 3, 5, 6, 7, 8–14 are removable in **under 4 hours total** and each removes a real user-visible lie. Rows 15, 16, 17 are 6–12 hours of real feature work. Row 18 is optional pre-launch.

---

## §4 Cross-cutting UX findings

Aggregated smells that surface across many rows in §2. Each row cites 2–4 representative occurrences.

### 4.1 Buttons that fire a network call without a loading state

Fifty-year-veteran rule (§6 of the prompt anti-patterns): "any click that talks to the network but shows no loading state → bug." Static-readable representatives:

- `messages/page.tsx:351, 370, 374, 381, 385, 389, 393, 397` — 8 bulk-action buttons, no spinner.
- `settings/page.tsx:667` — Manage blocklist, no spinner.
- `safety/page.tsx:101` — Submit Report; button text says "Submitting…" but no spinner or `disabled` visible in the render tree.
- `verify/page.tsx:108, 121` — Send email/phone OTP.
- `serious-mode/page.tsx:412, 553, 559, 791` — DTM top-10 refresh, apply filters, clear filters, numerology calc.
- `dtm/components/FamilyBrief.tsx:267-279` — Generate & Share.
- `profile/page.tsx:411, 460` — Save prompt / add interest.
- `ProfileDetailModal.tsx:67` — Kundli check.

**Recommendation:** create a `useBusyState()` hook or lift a `Button loading` variant (already exists in `ui/button.tsx:49-62` per shared-components agent) and apply consistently.

### 4.2 Failed requests without error UI

The 76 empty catches under `(main)/` cluster around:

- **Reads that gracefully fall back:** `layout.tsx:84, 155` (documented as intentional fail-open), `messages/page.tsx:336`, `discover/page.tsx:203, 214` — mostly benign, but user has no way to know load failed.
- **Writes that must not silently fail:**
  - `matches/page.tsx:77` (resume-incoming loop)
  - `matches/page.tsx:224` (hide-incoming)
  - `discover/components/ProfileCard.tsx:225` (pass)
  - `discover/components/AiSidePanel.tsx:147` (getMoveSuggestions)
  - `discover/components/MatchSuccessModal.tsx:119` (Move v2 fetch)
  - `discover/components/WhyCard.tsx:152` (less-like-this)
  - `messages/components/ChatView.tsx:472` (hide chat)
  - `messages/components/MessagesFeedbackModal.tsx:33` (submit feedback)
  - `creativity/components/CommentSheet.tsx:26, 37` (load + post comment)
  - `creativity/components/MoveModal.tsx:28` (send move)
  - `creativity/components/EarnDrawer.tsx:55` (claim streak)
  - `stories/components/StoryViewer.tsx:212, 216, 223, 235, 240, 325` (7-item context menu)
  - `feed/page.tsx:121, 146, 153` (like/comment/delete)
  - `videos/page.tsx:26, 31` (like/comment)
  - `profile/page.tsx:158` (loadProfile)
  - `beats/page.tsx:702, 804` (mute / report)
  - `serious-mode/page.tsx:198, 220, 267` (top-10 refresh / access action / chat send)
  - `dtm/page.tsx:108, 182` (deferred count / see-later)
  - `ai-match/page.tsx:105` (like)
  - `search/page.tsx:88` (like)
  - `love-language/page.tsx:313` (share)
  - `vibe-check/page.tsx:137` (share)
  - `access/page.tsx:54` (`r.ok` unchecked)

**Recommendation:** categorise into "fail-open read" (add `logError('surface.handler', e)` — still no toast, but Sentry-visible) vs "user-visible write" (add `useToast().error(...)` + `logError`). Estimate: ~4 person-days across the ~50 write sites.

### 4.3 Optimistic UI that could lie on failure

- `creativity/components/ReelsView.tsx:239-241, 266-268, 271-272, 282` — like/save/share flip pre-network.
- `feed/page.tsx:121-123` — like flip.
- `profile/page.tsx:148` — photo preview appended pre-upload.
- `premium/page.tsx:75` — "Selected!" copy pre-purchase.
- `dtm/page.tsx:323` (see-later) — question advances pre-save.
- `settings/page.tsx:29-45, 330` — toggle flips pre-server confirm; catch is empty so failure never rolls back visually.

**Recommendation:** wrap in `useOptimistic()` (React 19-compatible) with an explicit rollback callback wired to the same catch that shows the error toast.

### 4.4 Icon-only buttons missing `aria-label`

Every modal has an X close button; most are `<button>` with no `aria-label`. Ratio: 398 `<button>` : 31 `aria-label`. Representative:

- `ui/modal.tsx:51` (close X — inherited by every modal in the app)
- `ui/toast.tsx:119, 144` (dismiss X)
- `settings/page.tsx:130` (Sessions modal X)
- `date-ideas/page.tsx:156` (spotlight close ×)
- `date-planner/page.tsx:208` (planner modal X)
- `creativity/page.tsx:178` (clear search X)
- `messages/components/MoveV2Picker.tsx:192` (already has aria-label — good example)

**Recommendation:** add `aria-label="Close"` to `ui/modal.tsx:51` — single edit fixes every modal on the app. Estimate: 10 min for the parent + 2 h to sweep the leaves.

### 4.5 `role="button"` divs missing keyboard handlers

- `discover/components/ShortcutBar.tsx:746` (Clear category X) — no `onKeyDown`.
- `deferred/DeferredPileModal.tsx:136` — no `role`, no `onKeyDown`, only `onClick`.
- Several drop zones (`StoryCreateModal.tsx:359, 410`, `MediaPicker.tsx:180-205`) are correct — `onKeyDown` present.

**Recommendation:** convert `role="button"` divs to `<button type="button">` where visually possible, or add `onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handler()}` per WAI-ARIA guidance.

### 4.6 Missing disabled-cursor / hover feedback

Not directly grep-visible; would need live click-test. Deferred to §6.

### 4.7 Native alert / confirm / prompt

- `alert(...)` — 2 in `EarnDrawer.tsx:52-53`
- `window.alert(...)` — 1 in `SpotlightUI.tsx:267`
- `window.confirm(...)` — 1 in `SpotlightUI.tsx:258`
- `window.prompt(...)` — 1 in `creativity/components/ReelsView.tsx:455` (Report reason)

**Recommendation:** the app has a `useToast()` + `<Modal>` + `<InputModal>` + `<ConfirmDialog>` (in `ui/modal.tsx`) — replace all four hits with library equivalents. Total: 1 h.

### 4.8 Console logs / debug statements in production paths

Not the click-audit's scope; §Phase A finding 4 covered 166 hits. Same treatment applies inside the web app — `layout.tsx:48, 53, 58, 136` are `if (NODE_ENV === 'development') console.log(...)` — acceptable, but should still route through `logger.ts` when introduced.

---

## §5 Top-30 fixes ranked by user-impact-per-hour

Ordered by **founder-visible user-hours-of-frustration-per-engineer-hour** (fifty-year-veteran arbitration). Every P1 that is a coming-soon dead button ranks above every P1 that is a silent-catch — because a dead button is a *lie*, and a silent-catch is a *degradation*.

| # | Fix | Location | Sev | Effort | User impact |
|---:|---|---|---|---|---|
| 1 | Remove/wire 5 dead Settings buttons (Cancel subscription, Email us, Share feedback, What's new, Rate Miamo) | `settings/page.tsx:698, 709-712` | P1 | 90 min | Every Settings visitor sees dead clicks |
| 2 | Wire "Start Verification" to `/verify` route | `profile/page.tsx:526` | P1 | 5 min | Every profile visit sees dead button |
| 3 | Fix Compatibility "Share Results" button (currently calls resetQuiz) | `compatibility/page.tsx:219` | P1 | 30 min | Wrong action fires; users lose quiz result |
| 4 | Remove Video/Voice call preview UI in ChatView + MatchCard | `ChatView.tsx:147-155, 455-456`, `matches/page.tsx:306`, `MatchCard.tsx:211` | P1 | 45 min | Removes 2 fake buttons from the top 3 surfaces |
| 5 | Remove voice-note fake handler (sets emoji placeholder) | `ChatView.tsx:754` | P1 | 15 min | Users tap voice icon expecting recording |
| 6 | Replace `alert()`/`window.confirm()`/`window.alert()`/`window.prompt()` with toast + Modal | `EarnDrawer.tsx:52-53`, `SpotlightUI.tsx:258, 267`, `ReelsView.tsx:455` | P1 | 60 min | Native dialogs break mobile UX + focus trap |
| 7 | Add error toast to matches bulk resume-loop | `matches/page.tsx:77` | P1 | 20 min | Users see false "Resumed X" even on partial failure |
| 8 | Add error toast to matches hide-incoming | `matches/page.tsx:224` | P1 | 15 min | Toast race clobbers error |
| 9 | Add error handling to ProfileCard.pass | `discover/components/ProfileCard.tsx:225` | P1 | 15 min | Failed pass hides silently — bad for algo signal |
| 10 | Add loading + error to Feed toggleLike / delete / comment | `feed/page.tsx:121-123, 146, 153` | P1 | 30 min | Feed likes lie on failure |
| 11 | Add loading + error to Videos like / comment | `videos/page.tsx:26, 31` | P1 | 20 min | Same class as feed |
| 12 | Add loading + error to Creativity CommentSheet load + post | `CommentSheet.tsx:26, 37` | P1 | 20 min | Comment sheet silent-fails |
| 13 | Add loading + error to Creativity MoveModal send | `MoveModal.tsx:28, 101` | P1 | 15 min | Move silently swallowed |
| 14 | Add loading + error to Creativity EarnDrawer claim | `EarnDrawer.tsx:55` | P1 | 15 min | Streak claim silent-fail |
| 15 | Add loading + error to StoryViewer 7 menu actions | `StoryViewer.tsx:212-325` | P1 | 45 min | Every story-menu action silent-fails |
| 16 | Add loading + error to Settings toggle rollback | `settings/page.tsx:330` | P1 | 30 min | Toggle sticks after backend rejects |
| 17 | Verify onboarding "Enable DTM mode" awaits patchProfile before router.push | `onboarding/page.tsx:315` | P1 | 15 min | Race: user lands on DTM in Casual mode |
| 18 | Fix profile photo optimistic preview rollback on upload failure | `profile/page.tsx:148` | P1 | 30 min | Failed upload leaves ghost preview |
| 19 | Fix profile loadProfile empty-catch | `profile/page.tsx:158` | P1 | 15 min | Infinite skeleton on load failure |
| 20 | Fix Serious-mode chat send silent-fail | `serious-mode/page.tsx:240, 267` | P1 | 20 min | Matrimonial chat loses messages silently |
| 21 | Fix Serious-mode access-request Grant/Deny/Revoke silent-fail | `serious-mode/page.tsx:210, 220, 753-759` | P1 | 20 min | Critical DTM flow silently fails |
| 22 | Fix DTM answer POST endpoint TODO (or disable button until endpoint ships) | `dtm/page.tsx:165` | P1 | 2 h (wire) or 15 min (disable) | Answer button lies |
| 23 | Fix access-page decide() to check `r.ok` | `access/page.tsx:54` | P1 | 10 min | 500 silently treated as success |
| 24 | Add `aria-label="Close"` to base Modal X + audit leaves | `ui/modal.tsx:51` + 8 leaves | P2 | 90 min | Screen-reader UX across every modal |
| 25 | Add spinner + `disabled` to messages bulk-action buttons | `messages/page.tsx:351-397` | P2 | 30 min | 8 buttons in the busiest surface |
| 26 | Add loading state to Verify email/phone OTP send | `verify/page.tsx:108, 121` | P2 | 20 min | Users re-tap and get 429 |
| 27 | Fix Verify auto-verify vs manual verify race | `verify/page.tsx:113-114` | P2 | 30 min | Double-fire on Enter |
| 28 | Add loading state to Safety Submit Report | `safety/page.tsx:101` | P2 | 15 min | Double-submit risk |
| 29 | Add loading state to Settings block-list Manage | `settings/page.tsx:667` | P2 | 15 min | Silent network delay |
| 30 | Remove Premium "Selected! Payment coming soon" optimistic copy | `premium/page.tsx:75` | P2 | 15 min | Lies about payment status |

**Rollup:** if the panel ships the Top-30 in the order above, the founder-facing lie-count drops from 20+ to 0 in **~13 engineering hours**. This is Phase B.5's scope. The remaining ~120 P2/P3 items (largely a11y polish + silent-read catches) become Phase B.6, targeting ~4 person-days.

---

## §6 Deferred to next Phase B run — live click-test only

Bugs that can't be confirmed from static reading. Every item here needs a real browser session with each of miamo10 / miamo15 / miamo20 / miamo5 personas.

| # | Suspected bug | Route | Why static-unreadable |
|---:|---|---|---|
| 1 | Discover swipe gesture on iOS Safari — 60fps? layout shift on card exit? | `/discover` | Only measurable with real touch input + DevTools performance panel |
| 2 | Match modal Move v2 — 5 suggestions visible above the fold on 375×667 iPhone SE? | `/discover` → match | Layout only knowable at real viewport |
| 3 | ChatView virtualized message list — does message-list scroll jump on load-more? | `/messages/:id` | Scroll behaviour needs live paint |
| 4 | StoryViewer press-and-hold pause — does it actually pause on Android Chrome? | `/stories` | Touch-event contract varies across engines |
| 5 | Voice-fingerprint modal — Canvas render on low-end Android? | `/messages` | GPU / canvas perf needs device profiling |
| 6 | SSE new-message toast — does it appear if user is on `/dtm` (not `/messages`)? | any | SSE subscription state is runtime-only |
| 7 | Onboarding age-picker — keyboard-only nav works? | `/onboarding` | Focus-order is often broken silently |
| 8 | Filter drawer — pool count updates within 500ms of any filter change? | `/discover` filter panel | Debounce timing needs live check |
| 9 | Profile photo upload — is EXIF orientation respected on iPhone photos? | `/profile` | Real photo needed |
| 10 | Premium plan-tap — does the "Selected!" flash actually persist to the checkout that's not built yet? | `/premium` | Handler is optimistic-only; awaiting B.4 |
| 11 | Payment success/failure flow — Razorpay webhook + UI update? | `/premium` | Stubs everywhere per launch-status |
| 12 | Google/Apple OAuth returning to correct route | `/login`, `/(main)/*` | Providers stubbed per launch-status B.3 |
| 13 | Report + block bidirectional invisibility (Priya reports Rohan → Rohan invisible to Priya immediately AND vice-versa on next Discover call) | `/discover`, `/matches`, `/messages` | Cross-session behaviour needs 2 logged-in browsers |
| 14 | ChatView background picker — persists across chat re-open? | `/messages/:id` | State roundtrip needs live retest |
| 15 | Beats screenshot detection — actually fires on the CMD+SHIFT+3 combo on macOS Chrome? | `/beats` | Only observable at runtime |
| 16 | DeferredPileModal keyboard nav — tab-order sensible? | `/discover` | Tab-order not statically verifiable |
| 17 | Vibe-check step transitions — does back-button preserve state? | `/vibe-check` | Router history is runtime |
| 18 | Family Brief PDF download works on Chrome Android? | `/dtm` | Download UX varies |
| 19 | Weekly Top-10 countdown timer (per launch-audit §Full-Stack row S14) | `/discover` | Static countdown is trivial to read; **live** whether it updates every second is not |
| 20 | Voice-note recording (once shipped) works with iPhone Safari MediaRecorder? | `/messages` | Media-device permissions needed |

---

## §Appendix A — Method

The scan ran as follows (record for reproducibility by the next Phase-B agent):

1. **File census.** `find services/web/src/app/\(main\)/ -name "*.tsx" -type f` — 73 hits. Plus 23 shared under `services/web/src/components/**`. Plus 5 root error/loading/not-found boundaries + `coming-soon/page.tsx`. Total 101 files.
2. **Static grep pass** (results in §3 and §4):
   - `grep -rEn "ComingSoon|coming soon|Coming Soon" services/web/src/`
   - `grep -rEn "TODO|FIXME|XXX|HACK" services/web/src/app/\(main\)/`
   - `grep -rEn "not implemented|placeholder|TBD|we're building" services/web/src/`
   - `grep -rEn "alert\(|window\.confirm|window\.alert|window\.prompt" services/web/src/`
   - `grep -rEn "catch\s*\(\w*\)\s*\{\s*\}|catch\s*\{\s*\}" services/web/src/app/\(main\)/` → 76 hits
   - `<button>` count under `(main)/`: 398. `aria-label` count: 31.
3. **Enumeration pass.** Fanned out 6 explore-agents in parallel:
   - Cluster 1: Discover + Matches (16 files)
   - Cluster 2: Messages + Beats (13 files)
   - Cluster 3: Creativity + Feed + Stories + Videos + Showcase (17 files)
   - Cluster 4: DTM + Serious-mode + Onboarding + Profile (14 files)
   - Cluster 5: Settings + Notifications + Safety + Verify + Premium + minor routes (15 files)
   - Cluster 6: Shared components + error boundaries + coming-soon grep (28 files + grep aggregation)
   Each agent produced per-file interactive-element tables with expected behaviour + smell tags.
4. **Aggregation.** Rows with a smell → §2 tables. Rows healthy → summarised in the run-total. Cross-cutting themes → §4. Prioritised → §5.

**Panel arbitration log:**
- QA lens argued the empty-catch class deserves a blanket P0. Frontend lens argued P2 because most reads are non-critical. Fifty-year tiebreak: writes-that-must-not-fail get P1, reads-that-fall-back get P2. Applied above.
- UX lens argued the coming-soon dead buttons in Settings are P0 because Settings is the churn-risk surface. Product lens argued P1 because Settings isn't onboarding-critical. Tiebreak: P1 with high-rank in §5 (rows 1–2). Applied.
- Accessibility lens argued P1 on missing aria-labels. Frontend lens argued P2 given the fix is a one-line inheritance in `ui/modal.tsx`. Tiebreak: P2, but ranked #24 in §5 to catch it in Phase B.5 anyway.

---

## §Appendix B — References

- `docs/architecture/full-audit.md` — Phase A full-tree audit
- `docs/architecture/launch-audit.md` — 7-lens launch audit
- `docs/architecture/launch-status.md` — session-boundary handoff
- `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` — this brief's authorship

**Signed off by:** Principal Engineer, arbitrating between Lead Architect, Lead Full-Stack, Senior UX Researcher, Senior QA, Senior Behavioural Analyst, Senior ML, Senior Backend, Senior Frontend, Senior Test Engineer.

**Next action:** founder review, then Phase B.5 executes the Top-30 in `§5`, committing per-surface fixes with a co-located test each.
