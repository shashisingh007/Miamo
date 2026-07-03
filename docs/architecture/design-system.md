# Design System Audit — Phase G.14

**Authored:** 2026-07-02
**Scope:** `services/web/src/**/*.tsx` (Next.js 14 web app)
**Owner:** design-engineering + graphics-engineering panel lens
**Cross-refs:** `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.14`, `services/web/src/styles/tokens.css` (Tailwind tokens), `tests/a11y-invariants.test.ts`

This is a **grep-scoped, screenshot-free audit** — every finding is anchored to a `file:line` an engineer can jump to. It is not a lint replacement. It is the "which corners have we cut and where do we bleed pixels" map that lets a design engineer clear the top-20 offenders in one afternoon.

Design tokens live in Tailwind config + `services/web/src/styles/tokens.css`. The system is: `rose-main`, `rose-dark`, `miamo-card`, `miamo-surface`, `miamo-elevated`, `text-primary`, `text-secondary`, `text-muted`, `border`. Anything outside that set that leaks into a `.tsx` is a token-drift finding.

---

## 1. Design token inventory

### 1.1 Hardcoded hex colours — top 20 offenders

Counted via `grep -rEnc --include='*.tsx' '#[0-9a-fA-F]{3,8}'`. **Total: ~150 hex literals across 22 tsx files.** These fall into two categories: (a) `dark:` overrides that predate the `miamo-*` dark tokens (fixable by swapping in the token), and (b) accent-colour flourishes that should live in `tokens.css`.

| Rank | File | Line | Hex | Recommended token |
|-----:|---|---:|---|---|
| 1 | `services/web/src/app/(main)/settings/page.tsx` | 41 | `#2A2D34` | `dark:bg-miamo-elevated` |
| 2 | `services/web/src/app/(main)/settings/page.tsx` | 41 | `#3A3E47` | `dark:border-border` |
| 3 | `services/web/src/app/(main)/settings/page.tsx` | 58 | `#2A2D34` | `dark:border-border` |
| 4 | `services/web/src/app/(main)/settings/page.tsx` | 65 | `#F4F1EC` | `dark:text-text-primary` |
| 5 | `services/web/src/app/(main)/settings/page.tsx` | 66 | `#7A746D` | `dark:text-text-muted` |
| 6 | `services/web/src/app/(main)/settings/page.tsx` | 78 | `#1F2229` | `dark:bg-miamo-surface` |
| 7 | `services/web/src/app/(main)/settings/page.tsx` | 86 | `#2A2D34` | `dark:bg-miamo-card` |
| 8 | `services/web/src/app/(main)/settings/page.tsx` | 87 | `#B8B3AC` | `dark:text-text-secondary` |
| 9 | `services/web/src/app/(main)/settings/page.tsx` | 104 | `#181A1F` | `dark:bg-miamo-card` |
| 10 | `services/web/src/app/(main)/matches/page.tsx` | (14 hits) | `#…` | rose/miamo tokens |
| 11 | `services/web/src/app/(main)/layout.tsx` | 219,239,248,264,269,363,364,367,406,412,416,422,427 | `#C97856` / `#D4896A` | new token `accent-copper-light` / `-dark` |
| 12 | `services/web/src/app/(main)/messages/components/VoiceFingerprint.tsx` | (10 hits) | `#…` | audio-viz palette in tokens |
| 13 | `services/web/src/app/(main)/discover/components/ProfileCard.tsx` | (9 hits) | `#…` | rose/miamo tokens |
| 14 | `services/web/src/app/(main)/vibe-check/page.tsx` | (8 hits) | `#…` | rose tokens |
| 15 | `services/web/src/components/ui/miamo-logo.tsx` | (7 hits) | brand hexes | keep — brand asset |
| 16 | `services/web/src/app/(main)/discover/page.tsx` | (7 hits) | `#…` | rose tokens |
| 17 | `services/web/src/app/(main)/messages/components/ChatView.tsx` | (6 hits) | `#…` | rose tokens |
| 18 | `services/web/src/app/(main)/beats/components/BeatWidgets.tsx` | (5 hits) | `#…` | rose tokens |
| 19 | `services/web/src/components/AuthOptions.tsx` | (4 hits) | `#…` | rose tokens |
| 20 | `services/web/src/app/(main)/serious-mode/components/BioDataPreview.tsx` | (4 hits) | `#…` | print-preview greys OK to keep |

**Two named accent hexes recur so often we should promote them to tokens:** `#C97856` (copper primary) → `accent-copper` and `#D4896A` (copper light) → `accent-copper-light`. This alone kills ~30 offenders in `(main)/layout.tsx` and downstream. **Estimated cleanup: 3h for a design engineer.**

### 1.2 Spacing values — no offenders

Tailwind's spacing scale (`p-1..p-96`, `gap-*`, `space-*`) is exclusive across the codebase — grep for `p-\[` and `m-\[` returns only 3 legitimate arbitrary values (all in `layout.tsx` for the sidebar width). No action.

### 1.3 Radii — no offenders

`rounded-{sm,md,lg,xl,2xl,3xl,full}` covers 100% of usage. Arbitrary `rounded-[Npx]` appears twice (`layout.tsx:406`, `page.tsx:1243`) both intentional (safe-area / hero).

---

## 2. Icon set

- **`lucide-react`:** 80 tsx files import from `lucide-react`. This is the canonical set.
- **Stray inline SVGs:** grepped `<svg` under `services/web/src`: 5 hits in `SocialProof.tsx`, `page.tsx` (marketing), `miamo-logo.tsx` (brand), `compatibility/page.tsx` (custom score ring), `LoveLanguageScorecard.tsx` (radar chart). All are legitimate (branded / data-viz / custom).

**Recommendation:** no action — the codebase already unifies on `lucide-react` and the 5 stray SVGs each solve a case Lucide can't (brand identity, custom charts).

---

## 3. Motion

- **`framer-motion`:** 69 tsx files import from `framer-motion` (~1200 `animate=`/`initial=` prop usages).
- **`useReducedMotion` respect:** only **1 of 69 files** (`services/web/src/app/page.tsx`) reads `useReducedMotion`. That's the marketing landing — the (main) app **does not honour `prefers-reduced-motion`.**

**Impact:** WCAG SC 2.3.3 (Animation from Interactions, AAA) violated across the entire authenticated experience. Users with vestibular disorders get spring-animated everything.

**Recommended fix:** ship a `useMiamoMotion()` hook that combines `useReducedMotion()` with `Settings.reduceMotion` (already a Prisma column). Wrap the top 10 most-visible `motion.*` sites first (Discover cards, Match modal, Toast, ConfirmDialog, StoriesRail). **Estimated: 4h.**

---

## 4. Image performance

- **`<img …>`:** 30 tsx files use raw `<img>`. Every one is flagged as needing `next/image` for automatic AVIF/WebP + responsive `sizes`.
- **`next/image`:** only 2 tsx files import `Image` from `next/image` (marketing landing).

**Above-the-fold priority list** (LCP candidates — must migrate first):
1. `services/web/src/app/(main)/discover/components/ProfileCard.tsx` — the main photo of a discover card. LCP driver on `/discover`.
2. `services/web/src/app/(main)/matches/page.tsx` — the match tiles.
3. `services/web/src/app/(main)/creativity/components/ReelsView.tsx` — full-bleed video posters.
4. `services/web/src/app/(main)/discover/components/WeeklyTop10.tsx` — hero above-the-fold.

Below-the-fold (still worth migrating, lower urgency): message bubbles, showcase composer, comment sheet, chat view.

**Estimated migration effort:** 6h for the 4 above-fold; a further 6h for the remaining 26. Alt attributes are already covered by `a11y-invariants.test.ts` today.

---

## 5. Empty states

Routes with a list/collection surface and **no user-visible empty-state UI** (either the container renders nothing, or a raw `"No results"` string with no illustration/CTA):

| Route | Component | File | Line hint |
|---|---|---|---:|
| `/discover` | (queue drained) | `discover/page.tsx` | — no empty renderer; the card fades and nothing replaces it |
| `/matches` | matches tab | `matches/page.tsx` | shows "No matches yet" text only |
| `/messages` | inbox | `messages/page.tsx` | shows "No conversations" text only |
| `/feed` | posts feed | `feed/page.tsx` | — |
| `/creativity` | reels view | `creativity/page.tsx` | shows "Nothing here" |
| `/creativity/showcases` | showcase grid | `showcase/page.tsx` | — |
| `/stories` | active stories | `stories/page.tsx` | — |
| `/notifications` | inbox | `notifications/page.tsx` | — |
| `/beats` | active beats | `beats/page.tsx` | — |
| `/search` | zero-results | `search/page.tsx` | — |
| `/access` | pending requests | `access/page.tsx` | — |
| `/vibe-check` | previous rounds | `vibe-check/page.tsx` | — |

**Recommended fix:** ship the `<EmptyState>` primitive (this session) and wire it into these 12 surfaces incrementally. **Estimated: 10 min per surface × 12 = 2h.** Bias: `/discover`, `/matches`, `/messages` first — those are the day-1 empty-state landing pages a new user will see.

---

## 6. Error states

Routes with **no explicit 4xx/5xx/network-error UI** — they either silently blank or throw an unhandled error to the Next.js `error.tsx` boundary:

| Route | Missing kind |
|---|---|
| `/discover` | no distinct offline vs. server error UI |
| `/matches` | same |
| `/messages` | Send fails silently — see `MessagesFeedbackModal` retry path |
| `/creativity` | reel load fail = blank frame |
| `/settings` | put-settings fail toasts but does not roll back optimistic UI |
| `/feed` | fetch fail = empty container |
| `/search` | 429 / timeout = empty results (indistinguishable from zero-hit) |
| `/notifications` | inbox fetch fail = empty inbox (looks like "you have no notifications") |

**Recommended fix:** the same `<EmptyState>` primitive with variant `error` handles this — one component, two visual modes (empty vs error). Wire alongside the empty-state pass in §5.

---

## 7. Skeleton screens

Routes with a Next.js `loading.tsx` file (renders during React 18 Suspense boundary during first paint):

| Route | Has `loading.tsx` |
|---|:-:|
| `/creativity` | ✓ |
| `/discover` | ✓ |
| `/matches` | ✓ |
| `/messages` | ✓ |
| `/access` | ✗ |
| `/ai-match` | ✗ |
| `/compatibility` | ✗ |
| `/date-ideas` | ✗ |
| `/date-planner` | ✗ |
| `/dtm` | ✗ |
| `/notifications` | ✗ |
| `/onboarding` | ✗ |
| `/premium` | ✗ |
| `/profile` | ✗ |
| `/safety` | ✗ |
| `/search` | ✗ |
| `/settings` | ✗ |
| `/showcase` | ✗ |
| `/stories` | ✗ |
| `/verify` | ✗ |
| `/vibe-check` | ✗ |
| `/videos` | ✗ |

**Recommended fix order** (highest user visibility):
1. `/profile` — every user visits multiple times per session
2. `/notifications` — bell click, first thing after login
3. `/stories` — top of discover, common tap
4. `/settings` — high engagement, slow due to lots of data
5. `/search` — every explicit search
6. `/showcase` — creativity-track discovery

Add `loading.tsx` in each of those 6 first, each ~15 min = 1.5h.

---

## 8. Dark mode

Files that hardcode `bg-white` (32 files) or `text-black` (subset thereof):

| File | Concern | Fix |
|---|---|---|
| `services/web/src/app/(main)/settings/page.tsx` | `bg-white dark:bg-[#2A2D34]` (line 86) | already dark-mode-aware, but hex should be token |
| `services/web/src/app/(main)/discover/components/ProfileCard.tsx` | ` bg-white/10` overlays | fine — semi-transparent overlays don't need dark variant |
| `services/web/src/app/(main)/discover/components/WhyCard.tsx` | `bg-white` for card body | needs `dark:bg-miamo-card` — currently broken in dark mode |
| `services/web/src/app/(main)/creativity/components/EarnDrawer.tsx` | `bg-white` for drawer | broken in dark |
| `services/web/src/app/(main)/access/page.tsx` | `bg-white` bare | broken in dark |
| `services/web/src/app/(main)/verify/page.tsx` | `bg-white` bare | broken in dark |
| `services/web/src/app/(main)/discover/components/DiscoverFilterModal.tsx` | `bg-white` bare | broken in dark |

**Verdict:** the "bare `bg-white`" (i.e. no `dark:` sibling) files are the ones that flash white in dark mode. There are approximately 10 such surfaces. Priority-fix them alongside the token pass in §1.

---

## 9. Recommended fix order (top 10 by user-visibility ÷ effort)

Ranked so a design engineer can pick them off in a day.

| # | Item | Est. | User visibility |
|--:|---|--:|---|
| 1 | Ship `<EmptyState>` primitive (this session) | 1h | very high — everywhere |
| 2 | Wire empty-state into `/discover`, `/matches`, `/messages` | 45m | very high — day-1 landing |
| 3 | Add `loading.tsx` to `/profile`, `/notifications`, `/settings` | 45m | high — every session |
| 4 | Migrate 4 above-fold `<img>` → `next/image` | 3h | LCP + Lighthouse win |
| 5 | Ship `useMiamoMotion()` hook + apply to Discover/Match/Toast | 2h | a11y compliance |
| 6 | Promote `#C97856` / `#D4896A` → `accent-copper` token | 30m | kills 30 hex offenders |
| 7 | Fix bare `bg-white` in `/access`, `/verify`, `DiscoverFilterModal`, `EarnDrawer`, `WhyCard` | 40m | dark-mode UX |
| 8 | Replace remaining `dark:bg-[#…]` hexes with `dark:bg-miamo-*` tokens | 90m | maintenance |
| 9 | Wire `<EmptyState variant="error">` into 8 error-state surfaces | 1h | trust — silent-fail elimination |
| 10 | Migrate below-fold `<img>` → `next/image` (26 files) | 5h | perf tail |

**One-day sprint budget: ~14h.** After execution: 0 hardcoded copper hexes outside tokens, 0 bare `bg-white`, `EmptyState` in every listing surface, `<Skeleton>` on every route, reduced-motion respected in the hot 10 animations, LCP-critical images on `next/image`.

---

## 10. Primitives shipped this session

- `services/web/src/components/ui/skeleton.tsx` — pre-existing rich set (see file); **this session adds `role="status"` + `aria-busy` + 3 primitive variants (`SkeletonCard`, `SkeletonRow`, `SkeletonText`)** the empty-state pass will consume.
- `services/web/src/components/ui/empty-state.tsx` — **new**. Reusable `<EmptyState icon= title= description= action?= variant?='default'|'error'|'success'>`.

Both are covered in `tests/a11y-invariants.test.ts` with 8+ new assertions (see file after this session).

_End of design-system.md — next revision after top-10 fix pass is landed._
