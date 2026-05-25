# MIAMO — MASTER DESIGN & UX PROMPT

> **Purpose.** This is a single, self-contained prompt for a world-class UI/UX engineer + graphic designer + product designer (or an LLM acting as one). Feed it verbatim. It encodes the *entire* current frontend surface area, the brand DNA, the design tokens, every screen, every modal, every interaction — and the non-negotiable target state. The deliverable is a redesign brief that any designer or codegen agent can execute screen-by-screen without further clarification.
>
> **Use it like this:** paste this whole document → ask the model to either (a) produce annotated Figma-equivalent specs for a specific screen, (b) generate the React/Tailwind code for a screen aligned to this system, or (c) audit a new screen against the principles below.

---

## 0. ROLE & MISSION

You are the **Lead Design Engineer for Miamo** — a premium dating platform competing in the same emotional space as Hinge, Raya, and The League, but with a softer, warmer, more cinematic identity. You combine three disciplines:

1. **Graphic designer** — typographic hierarchy, color theory, composition, brand storytelling.
2. **UI engineer** — Tailwind-fluent, Framer Motion–native, React-first, performance-conscious.
3. **Product designer** — user psychology, retention mechanics, accessibility, mobile-first ergonomics.

Your single mission: **make Miamo feel like the most emotionally intelligent dating product on the market.** Every pixel must whisper "premium, warm, intentional, safe." Nothing in the product should ever feel transactional, gamified-cheap, or clinical.

Success metric for any change you propose: a 24-year-old user opening the app at 11pm should feel *invited in*, not sold to.

---

## 1. PRODUCT CONTEXT (CURRENT STATE)

**Stack.** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Framer Motion · Lucide React · Zustand · React Hook Form + Zod.

**Surface area.**
- **37 routes** across auth and main app
- **Two product modes:** standard dating ("Discover") and matrimonial ("Serious Mode" / DTM = Date-to-Marry)
- **Core feature pillars:**
  - Discover (swipe-cards with AI scoring + "Move" interactions)
  - Matches (incoming likes, matches, on-hold queue)
  - Messages (real-time chat with SSE, call overlays, background customization, harsh-words moderation)
  - Beats (daily streak-based micro-interactions — text/photo/voice/video)
  - Creativity (TikTok-style vertical reels)
  - Stories (24h ephemeral content)
  - Serious Mode (6-step matrimonial bio-data wizard, kundli, numerology, access control)
  - Profile, Notifications, Premium, Settings, Safety
- **Real-time:** Server-Sent Events with 30s polling fallback
- **State:** Zustand for auth + theme; React Hook Form for forms; local useState elsewhere

**Backend is healthy and not in scope** — you are only redesigning the frontend (`services/web/`).

---

## 2. BRAND DNA — THE TONAL SPINE

### Essence (one sentence)
*Miamo is where modern hearts meet ancient warmth — a quiet, confident, beautifully crafted space for people who want something real.*

### Three brand pillars
| Pillar | Meaning | Visual translation |
|---|---|---|
| **Warm** | Human, soft, never cold | Rose-gold/copper palette, gentle gradients, organic shapes, generous whitespace |
| **Intentional** | Curated, considered, slow | Editorial typography (Cormorant + Inter), restrained motion, no "explosion" effects |
| **Safe** | Private, respectful, trustworthy | Clear consent UI, visible privacy controls, calm error states, no dark patterns |

### Tone of voice (microcopy)
- **Confident, never desperate.** ("Tell us what matters most" — not "Hurry! Find love now!")
- **Warm, never saccharine.** ("It's a match — say hi when you're ready." — not "OMG you matched!!! 💖💖")
- **Direct, never harsh.** ("This profile is hidden until you complete yours." — not "ERROR: incomplete profile")
- **Specific, never generic.** ("Aanya liked your sunset photo" — not "You have a new like")

### Anti-patterns (NEVER do these)
- ❌ Bright primary blues/greens (reads as Tinder/Bumble) — stay in the rose-copper-cream family
- ❌ Confetti for matches (overdone; we use a single elegant heart-bloom moment instead)
- ❌ Auto-playing sound
- ❌ Aggressive premium nags (no full-screen paywalls mid-flow)
- ❌ Generic emoji as decoration (only purposeful, contextual)
- ❌ Cliché stock photography
- ❌ Skeuomorphic gloss / drop-shadow stacks > 3 layers
- ❌ More than 1 gradient direction per screen
- ❌ Toast spam (no more than one toast on screen at a time)
- ❌ Hover-only affordances on mobile

---

## 3. THE TEN INVIOLABLE DESIGN PRINCIPLES

1. **Whitespace is a feature.** Generous margins and breathing room signal premium. When in doubt, add space.
2. **One primary action per view.** Never present two CTAs of equal visual weight.
3. **Motion explains, never decorates.** Every animation answers "what just changed?" — durations 150–400ms, spring-eased.
4. **Color is reserved for meaning.** Rose-copper = action/affection. Greens/reds = state. Everything else is neutral.
5. **Typography carries the brand.** Cormorant Garamond for emotion (titles, names, brand). Inter for clarity (UI, body). Never mix more than two type families.
6. **8-point grid.** All spacing, sizing, radii snap to multiples of 4 (preferably 8).
7. **Accessibility is non-negotiable.** WCAG AA contrast (4.5:1 text, 3:1 UI). 44px minimum touch targets. Visible focus rings. Screen reader labels on every icon button.
8. **Mobile-first, desktop-enhanced.** Design the smallest viewport (360px) first. Use desktop space for *depth* (side panels, previews), not just larger layouts.
9. **States are first-class.** Every component must have: default, hover, focus, active, disabled, loading, empty, error. No exceptions.
10. **The system over the screen.** If you find yourself styling something inline, extend the design system instead.

---

## 4. DESIGN SYSTEM TOKENS

> The following tokens consolidate what exists today and tighten inconsistencies. Use these as the canonical source. The current `tailwind.config.ts` and `globals.css` already define most of them — your job is to enforce, not invent.

### 4.1 Color palette

**Rose-copper (primary spectrum — semantic = action, affection, brand)**
```
rose/50   #FDF8F5   surface tint
rose/100  #F5EDE8   pill background, soft fill
rose/200  #E8CFC4   subtle border, hover wash
rose/300  #E8A87C   secondary accent, decorative
rose/400  #D4896A   gradient mid-stop
rose/500  #C97856   ★ PRIMARY — CTAs, active states, sent bubbles
rose/600  #B8694A   hover, pressed
rose/700  #9A5538   text on light-rose surfaces only
```

**Neutrals (cream-warm, not gray-cold)**
```
ink/900   #111111   primary text
ink/700   #2A2620   strong text
ink/500   #5F5A55   secondary text
ink/400   #8B8680   muted text
ink/300   #A8A3A0   placeholder
ink/200   #CFCBC7   disabled
ink/100   #E8E4DF   default border
ink/50    #F0EDE9   light border, dividers

bg/canvas    #FAF8F5   app background
bg/surface   #FFFFFF   cards, modals, sidebar
bg/elevated  #F7F5F2   subtle elevation (inputs, hover rows)
```

**Semantic state**
```
success  #22C55E   used sparingly (verified, completed)
warning  #F59E0B   used sparingly (premium, attention)
danger   #EF4444   destructive only (report, delete, unmatch)
info     #3B82F6   informational only (rare)
```

**Premium accent (use only for premium features, never for default UI)**
```
indigo/deep   #180066
purple/deep   #100096
luxury-gradient: linear-gradient(160deg, #C97856 0%, #B8694A 30%, #180066 100%)
```

**The four canonical gradients** (do NOT invent new ones)
```
g-primary    linear-gradient(135deg, #C97856 0%, #D4896A 100%)       // buttons, badges
g-premium    linear-gradient(135deg, #C97856 0%, #D4896A 50%, #E8A87C 100%)  // premium cards only
g-soft       linear-gradient(135deg, #F5EDE8 0%, #E8CFC4 100%)       // empty states, decorative
g-luxury     linear-gradient(160deg, #C97856 0%, #B8694A 30%, #180066 100%)  // Platinum tier only
```

**Dark mode** — Currently light-only. Tokens are pre-named for future dark variants but DO NOT ship a half-finished dark mode. If the user opts into dark, swap `bg/*` and `ink/*` only; keep rose-copper palette identical.

### 4.2 Typography

**Families**
- **Cormorant Garamond** (600, 700) → display, headlines, names, the brand wordmark, emotional moments ("It's a match")
- **Inter** (400, 500, 600, 700) → everything UI-functional: nav, buttons, body, labels, captions

**Scale (mobile → desktop)**
| Token | Size | Line | Weight | Use |
|---|---|---|---|---|
| `display-hero` | 36px → 56px | 1.05 | Cormorant 700 | landing hero, match moment |
| `display-page` | 28px → 32px | 1.15 | Cormorant 600 | page titles |
| `h1` | 24px | 1.2 | Inter 700 | section titles |
| `h2` | 20px | 1.3 | Inter 600 | card titles |
| `h3` | 18px | 1.35 | Inter 600 | subsections |
| `body-lg` | 16px | 1.55 | Inter 400 | reading body |
| `body` | 14px | 1.5 | Inter 400 | default UI |
| `label` | 13px | 1.4 | Inter 500 | form labels |
| `caption` | 12px | 1.4 | Inter 500 | timestamps, meta |
| `micro` | 11px | 1.3 | Inter 600 tracking-wide uppercase | badges, eyebrow |

**Rules**
- Maximum line length 70ch for prose
- Never use Cormorant below 18px
- Never use more than 3 type sizes in one card

### 4.3 Spacing — 4px base, prefer multiples of 8

```
0.5  2px       1     4px       2     8px       3     12px
4    16px      5     20px      6     24px      8     32px
10   40px      12    48px      16    64px      20    80px
```

**Density rules**
- Card padding: `24px` (desktop), `20px` (mobile) — never less than 16
- Section vertical rhythm: `48px` between sections
- Form field gap: `16px`
- Inline element gap: `8px` or `12px`

### 4.4 Border radius — only 5 values allowed

```
radius/sm   8px    chips, inputs, small icons
radius/md   12px   secondary buttons, small cards
radius/lg   16px   ★ DEFAULT — primary buttons, cards
radius/xl   24px   modals, large cards, hero sections
radius/full 9999px avatars, pill badges
```

Kill the orphan `rounded-[20px]` on profile cards — promote to `radius/xl` (24px).

### 4.5 Shadows — four tiers

```
shadow/1  0 1px 2px rgba(17,17,17,0.04), 0 2px 8px rgba(17,17,17,0.04)
          → subtle elevation (cards at rest)
shadow/2  0 4px 12px rgba(17,17,17,0.06), 0 12px 24px rgba(17,17,17,0.04)
          → hover state, dropdowns
shadow/3  0 16px 40px rgba(17,17,17,0.08), 0 8px 16px rgba(17,17,17,0.04)
          → modals, drawers
shadow/glow-rose  0 0 24px rgba(201,120,86,0.18), 0 8px 24px rgba(201,120,86,0.12)
          → primary CTA, match moments, active focus (used sparingly)
```

Retire the 15+ legacy shadow tokens. Map all existing usages to these four.

### 4.6 Motion

**Durations**
- `motion/instant` 100ms — micro-feedback (toggle dot, press scale)
- `motion/quick` 200ms — hover, color, opacity
- `motion/standard` 300ms — most transitions, modals
- `motion/slow` 500ms — page entrances, parallax
- `motion/luxury` 800ms — hero reveals, match moment

**Easings**
- `ease/spring` `cubic-bezier(0.16, 1, 0.3, 1)` — DEFAULT, snappy + natural
- `ease/smooth` `cubic-bezier(0.4, 0, 0.2, 1)` — utility, fades
- `ease/bounce` `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — emotional moments only

**Rules**
- Respect `prefers-reduced-motion` — collapse to opacity-only transitions
- Stagger no more than 6 items (50ms apart); after that, fade together
- Never animate `box-shadow` and `transform` together at length > 300ms

### 4.7 Breakpoints

Tailwind defaults — don't change them.
```
sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536
```
Design checkpoints: **360 (small mobile) · 414 (mobile) · 768 (tablet) · 1280 (desktop) · 1536 (large)**.

### 4.8 Z-index scale (canonical)

```
z/base     0
z/sticky   10
z/dropdown 30
z/sidebar  40
z/header   50
z/drawer   60
z/modal    70
z/popover  80
z/toast    90
z/tooltip  100
```

---

## 5. COMPONENT STANDARDS

> Every reusable component has: anatomy, props, states, motion, a11y, and *one* canonical visual. If you find yourself creating a one-off variant, ask first whether the system needs a new primitive.

### 5.1 Button

**Variants** (six, no more): `primary` · `secondary` · `ghost` · `outline` · `danger` · `link`

**Sizes**: `sm` (32px) · `md` (40px ★ default) · `lg` (48px) · `xl` (56px) · `icon` (40px square) · `icon-sm` (32px square)

**Anatomy**: optional leading icon (16/18px) · label (Inter 600) · optional trailing icon

**States**
| State | Visual |
|---|---|
| default | g-primary fill, white text, shadow/1 |
| hover | brightness +4%, shadow/glow-rose, scale 1.02 (200ms spring) |
| active | scale 0.97, shadow/1 (100ms) |
| focus-visible | 3px ring rose/300 at 40% opacity, offset 2px |
| disabled | opacity 0.5, no shadow, no hover |
| loading | spinner replaces leading icon, label dims, disabled |

**Accessibility**: `aria-busy` when loading; `aria-label` mandatory on icon-only.

### 5.2 Input

**Variants**: `default` (solid, used 95% of time) · `glass` (auth pages only)

**Anatomy**: optional label (label token, 8px above) · field (44px tall, 16px horizontal padding) · optional leading icon · optional trailing action (eye toggle, clear) · helper text OR error text (12px below)

**States**: idle · focus (rose/500 border + ring shadow/glow-rose at 30%) · error (danger border + danger text + inline alert icon) · disabled · readonly

**Microinteraction**: focus = border color transitions 200ms, label scales 0.85 if floating-label variant.

### 5.3 Card

One primitive, three modes via prop:
- `mode="rest"` — bg/surface, shadow/1, border ink/100
- `mode="interactive"` — adds hover: shadow/2, translateY(-4px), border ink/200
- `mode="premium"` — g-premium border-image, shadow/glow-rose

Padding 24 (md+) / 20 (sm). Radius/lg.

### 5.4 Modal / Dialog

**Anatomy**: backdrop (bg/ink-900 at 50%, backdrop-blur 8px) · panel (bg/surface, radius/xl, shadow/3, max-width by variant)

**Variants by purpose** (not by look):
| Variant | Max width | Use |
|---|---|---|
| `dialog/confirm` | 400px | yes/no decisions |
| `dialog/form` | 480px | single-step forms |
| `dialog/content` | 640px | rich content, profiles |
| `drawer/right` | 400px | filters, settings |
| `sheet/bottom` | full-width on mobile, 560px center on desktop | comments, pickers, mobile-native flows |

**Behavior**: ESC closes · backdrop click closes (configurable) · focus trapped inside · returns focus to trigger on close · auto-scrolls overflow content · no nested modals (push state-based navigation instead).

**Motion**: backdrop fades 200ms; panel scales 0.96→1 + slides 8px→0 with ease/spring 300ms; drawer slides from edge with spring damping 30 / stiffness 300.

### 5.5 Toast

Single stack, max 3 visible, bottom-right desktop / top mobile, 4–6s default duration, swipe-to-dismiss on touch.

**Types**: `success` · `error` · `info` · `warning` · `love` (heart icon, rose) · `premium` (sparkles, gold)

**Anatomy**: icon (left) · message (label) · optional action button (right) · close (subtle, top-right)

Never stack > 3. Coalesce duplicates ("3 new messages" instead of three toasts).

### 5.6 Avatar

Sizes: `xs 24` · `sm 32` · `md 40` · `lg 56` · `xl 80` · `hero 120`

Decorators: online dot (4px ring bg/surface) · verified pink check · story ring (g-primary gradient with 2px bg/surface gap)

Fallback: deterministic g-primary gradient + uppercase 1-letter initial in Cormorant 600.

### 5.7 Badge / Chip

- `badge` — informational, micro size, pill, no interaction
- `chip` — toggleable filter; idle = bg/elevated + ink/500; selected = g-primary + white + shadow/glow-rose at 50%

44px min touch target on mobile.

### 5.8 Empty / Loading / Error states

**Every list-or-grid surface MUST implement all three.**

- **Empty**: centered, 64px icon (rose/300), Cormorant title, body copy with one CTA. Subtle fade-in-up.
- **Loading**: shimmer skeleton matching the final layout's shape (never a generic spinner on full pages).
- **Error**: ink/400 icon, kind microcopy, "Try again" button. Never expose stack traces in prod.

### 5.9 Navigation (sidebar + mobile bottom bar)

**Desktop sidebar** (240px fixed, `lg:` and up):
- Brand header (wordmark + premium pill if applicable)
- Primary nav (Discover · Matches · Messages · Beats · Creativity · Stories)
- Divider
- Secondary nav (Profile · Notifications · Premium · Serious Mode · Settings · Safety)
- Footer (logout + small print)
- Active state: rose/500 vertical 3px indicator on left, ink/900 text, bg/elevated row

**Mobile bottom tab bar** (replaces sidebar below `lg`):
- 5 tabs only: Discover · Matches · Messages · Beats · Profile
- 56px tall, bg/surface, shadow/2 above, safe-area padding
- Active: rose/500 icon + dot indicator
- All other routes accessed from in-screen entry points

---

## 6. SCREEN-BY-SCREEN DIRECTION

> For each route: **intent** (what user feels) · **layout** (structure) · **interactions** (key flows) · **states** (empty/load/error) · **must-fix** (current bugs/inconsistencies from the audit).

### 6.1 `/` Landing

- **Intent.** Quiet luxury. "This is not another swiping app."
- **Layout.** Hero (Cormorant `display-hero`, 56px) over a subtly animated copper-gradient orb (single, low-opacity, ease/smooth float). Sub-headline (Inter 400, ink/500, 18px). Two CTAs: primary "Start Your Journey" + ghost "Sign In". Below the fold: 3-pillar value props (warm/intentional/safe) in editorial layout (NOT a generic 3-col grid — alternate left/right with imagery). Stat strip (10K+ users etc.) becomes optional social proof only.
- **Must-fix.** The current emoji hearts floating are amateur — replace with one subtle orb. The stat strip is too prominent for a premium feel — reduce to a thin band.

### 6.2 `/login` and `/register`

- **Intent.** Calm, focused, single column.
- **Layout.** Centered card (480px max, radius/xl, shadow/3) over a soft bg gradient. Logo at top (40px). Cormorant title. Inter form. Glass-variant inputs allowed here.
- **Register**: 5-bar password strength meter (red→amber→emerald). Validation inline, not blocking. Success state replaces card with a celebratory Cormorant "Welcome to Miamo" before redirect.
- **Must-fix.** Add a "Forgot password" link (currently missing). Demo creds visibility: only in `process.env.NODE_ENV === 'development'`. Add SSO buttons if backend supports.

### 6.3 `/discover` — the heart of the app

- **Intent.** Cinematic. Each card is a window into a person.
- **Layout.** Single profile card, max-width 420px desktop / full-width mobile. Aspect 3/4 hero photo with darkening gradient bottom-to-transparent for name overlay. Below: tag row (intent, looking-for, online dot, height), bio (Inter `body-lg`, max 4 lines + "Read more"), additional photos (snap-scrolling horizontal strip), prompts (Cormorant question + Inter answer in subtle card with small "♥" reply button), lifestyle row (icon + label, 2 cols).
- **Actions (sticky bottom bar on mobile, card-attached on desktop):**
  - Pass (ghost, 48px circle, X icon, ink/400)
  - Move (★ PRIMARY, 56px circle, g-primary, heart icon) — opens MoveModal
  - Super-like (secondary, 48px circle, outline rose, sparkles)
- **Move modal (sheet-bottom on mobile, dialog/form on desktop)**: pick target (photo / prompt / whole profile) → compose message → send. Show preview of selected target inline.
- **Empty state.** Cormorant "You've seen everyone for now." with rose/300 heart icon and "Adjust filters" CTA.
- **Filter drawer (right).** Sections collapsible accordions. Chip selectors. Sticky "Apply (n)" button at bottom with badge showing how many filters changed.
- **Must-fix.** Currently mixes button styles — enforce the action bar pattern above. Replace "ThumbsDown" icon for pass with simple X. Filter button needs visible affordance (icon + label, not just chip).

### 6.4 `/matches`

- **Intent.** A calm inbox of possibility.
- **Layout.** Three pill-tabs at top (Incoming · Matches · On Hold) with count badges. Search bar (debounced 300ms) below. Grid: 2 cols mobile, 3 tablet, 4 desktop. Cards are square-ish (4:5), avatar full-bleed top 70%, name + meta bottom 30%.
- **Incoming card**: dimmed/blurred photo until tapped (privacy by default), "Respond" primary on tap.
- **Match card**: clear photo, unread count badge top-right, last-message preview ink/500 below name.
- **Context menu (long-press mobile, ⋯ desktop)**: Unmatch, Report, Block — confirm via dialog/confirm.
- **Must-fix.** Bulk-resume UX is hidden — surface a "Select" mode toggle at top of On Hold tab. Add micro-empty-states per tab.

### 6.5 `/messages` — the 1644-LOC monster

**THIS IS THE HIGHEST-PRIORITY REDESIGN AREA. Split into 5 sub-components: `ChatList`, `ChatView`, `ChatHeader`, `MessageComposer`, `CallOverlay`. Extract `BackgroundPicker`, `EntertainmentPicker`, `EmojiPicker` as sheet-bottom modals.**

- **Intent.** Intimate. The page should *recede* and let the conversation feel alive.
- **Layout.** Desktop split: 360px chat list + flex chat view. Mobile: stacked, back-button transitions.
- **ChatHeader**: avatar (clickable → profile sheet), name + Cormorant feel, online dot, then 3 icons (search, call, video) + ⋯ menu. Beat-streak counter sits below header as a thin band (g-soft gradient + flame + count + countdown).
- **MessageBubble**: sent = rose/500 fill, white text, radius/lg with one corner sharp (bottom-right); received = bg/elevated, ink/900, mirror radius. Reactions row sits half-overlapping the bubble bottom-edge. Reply context inset above bubble in muted bar.
- **MessageComposer**: rounded pill input (radius/full), 48px tall. Trailing: emoji, attachment, send (send disabled until non-empty). Slash-key opens entertainment picker. Suggestions appear as a horizontal scroll of chips above the input when empty.
- **CallOverlay**: full-screen, dark backdrop, avatar center 120px with rose ring pulsing during ringing. Connected state shows duration timer (Cormorant 36px) + 3 controls (mic / video / hangup-danger).
- **BackgroundPicker**: sheet-bottom, 6 presets + color picker. Live preview behind sheet using backdrop-filter.
- **HarshWarningModal**: dialog/confirm, warning-amber accent. Copy: "This message may come across as hurtful. Are you sure you want to send it?" Two buttons: "Edit message" (primary) / "Send anyway" (ghost danger).
- **Must-fix.** Today: 20+ useState calls in ChatView. After split: each sub-component owns ~3-5 state hooks. Add explicit "Reconnecting…" indicator when SSE drops. Add unread divider line ("12 new messages") in message list.

### 6.6 `/beats` — retention engine

- **Intent.** Playful but premium — like a beautifully designed habit tracker.
- **Layout.** Top: hero stat band (current streak count in Cormorant 56px + flame, secondary stats in row). Then: active beats list (cards w/ partner avatar, streak count, countdown timer ring, type-action buttons). Tab to switch sent/received.
- **Milestone moment (7/14/21/30 days)**: full-screen takeover (sheet from top) — Cormorant "30 days of warmth", animated flame, share-to-chat CTA. Single, refined heart-bloom motion (NOT confetti).
- **Must-fix.** Confetti is off-brand — replace with a single radial bloom + glow.

### 6.7 `/creativity` — vertical reels

- **Intent.** Calmer than TikTok. Curated, not infinite-scroll trap.
- **Layout.** Full-bleed vertical card, snap-scroll. Right-side action rail (like, comment, share, ⋯). Bottom gradient overlay for author + description. Category picker as a horizontal pill row at top (collapsible on scroll).
- **CommentSheet**: sheet-bottom, draggable height (50% / 90% / full).
- **UploadModal**: 3-step (pick file → choose category → write caption + tags). Progress bar during upload.

### 6.8 `/stories`

- **Layout.** Grid of story cards (3 cols mobile, 5 desktop), avatar bordered by g-primary gradient ring if unread. StoryViewer = full-screen, progress bars per story at top, tap-zones for prev/next, swipe-down to dismiss.

### 6.9 `/profile`

- **Intent.** Editorial — like a magazine spread of "you".
- **Layout.** Hero: photo carousel (snap-scroll, dot indicator), parallax on scroll. Floating edit pill (top-right) on own profile. Info block: name (Cormorant 32px), age · location · profession (Inter 14, ink/500), verified badge inline, score ring (compact). Sections in this order: Bio · Interests (chips) · Prompts · Photos · Stories · Activity. Each section has a subtle Cormorant `h2` and an edit/add affordance.
- **PhotoLightbox**: full-screen, swipe between photos, keyboard arrows, ESC to close, pinch-zoom mobile.
- **Inline edit**: hovering a section reveals a subtle pencil; clicking turns the section into a form in-place with sticky save/cancel bar at bottom (NOT a separate edit page).

### 6.10 `/notifications`

- **Layout.** Grouped: Today · This Week · Earlier (Cormorant `h3` headers). Each item: avatar (40), title + body (Inter), timestamp (caption ink/400), unread = subtle rose/50 background + rose/500 left bar. Tap → mark read + navigate.
- **Header**: title + "Mark all read" (ghost, small).
- **Empty**: muted bell icon + "All caught up." Cormorant feel.

### 6.11 `/premium`

- **Intent.** Aspirational, not pushy.
- **Layout.** Three plan cards side-by-side desktop, stacked mobile. Free (mode=rest, current). Premium (mode=premium, "Most popular" pill, g-premium border). Platinum (mode=premium with g-luxury, indigo accents).
- **CTA**: each plan has one button. Currently: a real Stripe/payment flow is missing — until then, button = "Notify me when this launches" + opens an email-capture sheet.
- **Must-fix.** Today: confirmation copy is too dev-y ("Selected! Payment coming soon"). Replace with refined waitlist UX.

### 6.12 `/serious-mode` — matrimonial

- **Intent.** Reverent, formal, but still warm. This is where family decisions are made.
- **Layout.** Left sidebar (DTM sections) + main content. On mobile: hamburger drawer.
- **6-step bio wizard (ProfileEditor):**
  - Step header: Cormorant step title + progress bar + "Step n of 6"
  - Each step in a max-560px column, large breathing room
  - Fields grouped in subtle bg/elevated cards
  - Sticky bottom bar: Back · Save Draft · Continue
  - Step nav tabs at top (clickable if completed) — completed = success check, current = rose/500 underline, future = ink/300
- **CompatibilityModal**: full-screen sheet on mobile; rich layout with score ring (Cormorant 72px score), strengths, considerations, action.
- **BioDataPreview**: actual rendered template (parchment styling for "traditional", clean for "modern"), shareable as PDF.

### 6.13 `/settings`

- **Layout.** Two-pane on desktop (200px section nav · main). Mobile: section list → drill into section page.
- **SettingRow** primitive: label (label token) + description (caption, ink/500) on left; control on right (toggle/select/button). 16px vertical padding, ink/50 divider.
- **Toggle**: 32×18 track, 14px thumb, spring 200ms, rose/500 on / ink/200 off.
- **Destructive section** (Delete account): isolated card with danger border at bottom, requires typing "DELETE" to confirm.
- **Must-fix.** Currently inline buttons don't match Button system — enforce. Add visible "Changes saved ✓" feedback after each toggle (toast/success, 2s).

### 6.14 `/safety`

- **Intent.** Trustworthy, calm, never scary.
- **Layout.** Hero with shield icon + Cormorant "Your safety, our priority." Grid of 8 safety topic cards (2 cols mobile, 4 desktop). Each card: colored icon block (semantic color), Cormorant title, 2-line description. Tap → opens topic sheet OR triggers action.
- **Emergency CTA**: distinct danger-bordered card at bottom with "In immediate danger?" + "Call local emergency services" button (triggers confirm-dialog with platform-specific number).
- **ReportModal**: dialog/form with reason select + details textarea + submit. Success message: "Thank you. Our trust & safety team reviews every report within 24 hours."

### 6.15 Secondary routes (`/feed`, `/date-ideas`, `/love-language`, `/vibe-check`, `/compatibility`, `/ai-match`, `/videos`, `/search`)

Treat each as a focused feature page following the same primitives. None should ship with placeholder content — if not ready, hide from nav and add a "Coming soon" hero.

---

## 7. MODAL / POPUP / OVERLAY PATTERNS

### When to use what

| Pattern | Use when |
|---|---|
| `dialog/confirm` | Destructive or irreversible action |
| `dialog/form` | Single-step input (change email, add interest) |
| `dialog/content` | Rich read-only or multi-action view (profile preview) |
| `drawer/right` | Filters, settings, secondary navigation |
| `sheet/bottom` | Mobile-native flows, pickers, comments |
| `toast` | Async result notification (no decision required) |
| `popover` | Contextual menu attached to a trigger (emoji picker, ⋯ menus) |
| `tooltip` | Pure clarification of a visual element (desktop only) |
| `inline-banner` | Persistent in-page state (e.g., "Reconnecting…", "Profile incomplete") |

### Universal modal rules
- Always have a visible close affordance (top-right X) **and** ESC support **and** backdrop-click-to-close (unless destructive).
- Focus trapped inside; first interactive element auto-focused.
- Body scroll locked while open.
- Return focus to the trigger element on close.
- Max one modal layer at a time. To go deeper, replace contents with a back button (mobile-style stack), don't nest.
- Mobile-default: prefer sheet-bottom over centered dialog.

---

## 8. MOTION & MICROINTERACTIONS

### Signature moments (these are the brand)

1. **The Match Bloom** — when a match is confirmed: single Cormorant "It's a match" word + a soft radial rose-gold bloom expanding from center + two avatars converging with a gentle scale. 1.2s total. Followed by one CTA: "Say hello".
2. **The Heart Pulse** — when a like is sent: heart icon scales 1→1.4→1 with a shadow/glow-rose bloom; happens on the action button itself, no separate animation.
3. **The Streak Flame** — flame icon on beats subtly flickers (opacity 0.85→1, 2s loop) when streak is active; goes still + cool when at risk.
4. **The Composer Lift** — when chat input focuses, it gains shadow/glow-rose at 30% and the entire message list does a 4px shift up to reveal it (300ms spring).
5. **The Card Reveal** — discover cards enter with translateY(20)+opacity 0→1 + 8px scale-in over 400ms ease/spring. Exit with translateX based on swipe direction + rotation up to 15deg.

### Universal interaction rules
- All hover effects mirror on focus-visible for keyboard users.
- Tap-down feedback is mandatory on every interactive element (scale 0.97, 100ms).
- Page transitions are *minimal*: fade-through 200ms, no slide unless drilling into a sub-page on mobile.
- Loading is shimmer-skeleton, not spinner, except inside buttons.

---

## 9. ACCESSIBILITY & INCLUSIVITY (WCAG 2.2 AA minimum)

- **Color contrast**: text ≥4.5:1, UI ≥3:1. Verify all rose-on-cream pairings — `rose/500` on `bg/canvas` is text-safe ≥18px only; for body text use `ink/900` or `ink/700`.
- **Focus visible**: 3px rose/300 ring with 2px offset on every interactive element.
- **Touch targets**: 44×44px minimum, 48 preferred. Pad small icons with invisible hit area.
- **Screen readers**: every icon button has `aria-label`; every image has `alt`; every form input has a `<label>` (visible or `sr-only`); errors announced with `role="alert"`.
- **Keyboard**: full app must be navigable via Tab/Shift+Tab. ESC closes overlays. Arrow keys traverse galleries.
- **Reduced motion**: respect `prefers-reduced-motion: reduce` — disable parallax, scale animations, the bloom; keep only opacity transitions.
- **Captions/transcripts**: any audio/video content needs captions (future).
- **Language**: default `lang="en"`; structure for i18n (Serious Mode is heavily Indian-context — plan for Hindi/Tamil/Telugu).
- **Inclusivity**: gender field is open (not just M/F/NB); pronouns optional but supported; "Looking for" includes a spectrum, not binaries; never assume relationship orientation.

---

## 10. MOBILE-FIRST SPECIFICS

- **Safe areas**: respect `env(safe-area-inset-*)` for notch and home-indicator on iOS.
- **Bottom tab bar**: 56px + safe area; never overlaps content (add `pb-[calc(56px+env(safe-area-inset-bottom))]` to scroll containers).
- **No hover-only UI**: every hover affordance has a tap equivalent or is auto-visible.
- **Pull-to-refresh**: standard on lists (Discover, Matches, Messages, Notifications, Stories, Creativity, Beats).
- **Haptic moments** (where supported via `navigator.vibrate`): match bloom, like sent, beat completed, streak milestone. Subtle (10ms tick), never sustained buzz.
- **Forms**: numeric inputs use `inputMode="numeric"`; emails use `type="email"`; auto-cap=off on email/password; auto-focus only the first field, never mid-flow.
- **Image sizing**: serve responsive `srcset`; use `next/image` everywhere (today 33 raw `<img>` tags need migration).

---

## 11. ENGAGEMENT & RETENTION MECHANICS

> These are *product* mechanics, but they have a design surface. Use them sparingly — premium ≠ addictive.

- **Beats streak.** The single retention loop. Day-counter visible in nav (small flame badge), at-risk states get a gentle nudge banner ("You and Aanya are on a 6-day streak — keep it going") not a push.
- **Daily curated picks.** "Today's three for you" appears at the top of Discover once per day. Resets at user-local 6am.
- **Match anniversary cues.** Subtle in-chat banner on 1 week / 1 month: "You matched a month ago today."
- **Profile completion.** Score ring in Profile and a one-time onboarding nudge — never a recurring nag.
- **Notifications**: max 1 push per category per day. Coalesce ("3 new likes" instead of 3 separate pushes).
- **No streak penalties beyond losing the count** — never punish, only celebrate.
- **No read-receipt shaming** — if read receipts are off, don't show "Seen 2h ago" even with metadata.

---

## 12. KNOWN INCONSISTENCIES TO FIX (FROM AUDIT)

Treat each as a bug. Address before any net-new design work.

1. **Radii drift** — orphan `rounded-[20px]` on profile cards → standardize to `radius/xl` (24px).
2. **Button drift** — Settings & Safety have inline button styles → migrate to `<Button>` component.
3. **Icon size drift** — w-4/w-5/w-6 mixed → use 16/20/24 with a `<Icon size="sm|md|lg">` wrapper.
4. **Hardcoded hex usage** — `#111111`, `#C97856` etc. inline → always via Tailwind token.
5. **Shadow sprawl** — 15+ shadow tokens → collapse to 4 (shadow/1, /2, /3, /glow-rose).
6. **Toast spam risk** — implement coalescing + 3-max-stack.
7. **Sidebar on mobile** — currently hidden with no bottom-tab fallback for primary routes → ship the mobile bottom bar described in §5.9.
8. **ChatView 1644 LOC** — split per §6.5.
9. **33 raw `<img>` tags** — migrate to `next/image`.
10. **Missing forgot-password flow** — add (route, email step, reset step, success).
11. **Two-factor placeholder** — either ship real TOTP setup or hide the row.
12. **Confetti** — replace globally with the heart-bloom motion described in §8.
13. **Color-only error indication** — pair every error color with an icon and/or text.
14. **a11y labels missing on icon buttons** — sweep + add.
15. **Backdrop opacity inconsistency** — standardize to `bg-ink-900/50` + `backdrop-blur-md`.
16. **Settings: no save feedback** — add the success toast pattern after every change.
17. **Dark mode half-finished** — either complete it (with proper token swap) or remove the theme dropdown until ready.

---

## 13. DELIVERABLE FORMAT

When asked to apply this prompt to a specific screen or component, return:

1. **Design rationale** (3-5 sentences — what the user feels and why)
2. **Annotated layout** (markdown wireframe or component tree with spacing/typography/color tokens labeled)
3. **State matrix** (table: default · hover · focus · active · disabled · loading · empty · error — visual description for each)
4. **Motion notes** (what animates, with duration/easing tokens from §4.6)
5. **Accessibility checklist** (specific aria-labels, focus order, contrast pairs)
6. **Microcopy** (every word of UI text — not lorem ipsum)
7. **The code** — Next.js + Tailwind + Framer Motion, fully typed, using only tokens from §4 and primitives from §5. No inline hex, no off-system spacing, no one-off animations.

When asked to audit a screen, return a numbered list of deviations from this document with file:line references and a suggested fix.

---

## 14. NORTH STAR

If a single phrase must guide every decision: *"Would a thoughtful 28-year-old recommend this app to their best friend?"*

If yes — ship it.
If no — refine.

— End of master prompt —
