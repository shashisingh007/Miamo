# Miamo Mobile Launch Checklist — App Store + Play Store

**Audience:** the founder.
**Purpose:** every checkbox is a hard-block before store submission. Do not submit on a red gate.
**Read first:** [MOBILE.md](MOBILE.md) explains how the mobile stack works; this doc is the ceremony.

---

## §1 — Developer accounts (~1 week calendar time)

### 1.1 — Apple Developer Program — $99/year
- [ ] Sign up at https://developer.apple.com/programs/enroll/
- [ ] Enrolment approval: 24-48h for individual, longer for company
- [ ] Two-factor auth enabled on the Apple ID
- [ ] Team ID recorded (Membership page) → put into `mobile/eas.json` `submit.production.ios.appleTeamId`

### 1.2 — App Store Connect app record
- [ ] Create app at https://appstoreconnect.apple.com — pick bundle id `app.miamo.mobile`
- [ ] Record `ascAppId` (numeric) → into `mobile/eas.json`
- [ ] Fill: name, subtitle, primary/secondary category (Social Networking + Lifestyle)
- [ ] Age rating declared: **17+** (dating apps are 17+ on iOS)
- [ ] Content rights: "Does not contain, show, or access third-party content"
- [ ] Contact info: support email `support@miamo.app`, marketing URL `https://miamo.app`, privacy URL `https://miamo.app/legal/privacy`

### 1.3 — Google Play Console — $25 one-time
- [ ] Sign up at https://play.google.com/console
- [ ] Identity verification (photo ID + address) — takes 1-2 days
- [ ] Create app: package `app.miamo.mobile`, default language English (India)
- [ ] Categorize: Dating (or Lifestyle)
- [ ] Content rating questionnaire completed (dating app → Mature 17+ typically)
- [ ] Data safety declaration completed (see §5.2 below)

### 1.4 — Play Console service account for automated submits
- [ ] In Google Cloud Console: create service account with role "Service Account User"
- [ ] Grant it access in Play Console → API access → link → grant "Release manager" role
- [ ] Download JSON key → save as `mobile/google-service-account.json` (add to `.gitignore` — never commit)

### 1.5 — Expo account for EAS
- [ ] Sign up at https://expo.dev (free)
- [ ] `eas login` on your Mac
- [ ] `cd mobile && eas init` — creates the EAS project id
- [ ] Copy the id into `mobile/app.json` → `expo.extra.eas.projectId`

---

## §2 — Assets you must create (~1-2 days design work)

### 2.1 — Icon + splash
- [ ] `mobile/assets/icon.png` — 1024×1024 PNG, opaque, no rounded corners (iOS adds them)
- [ ] `mobile/assets/adaptive-icon.png` — 1024×1024 with safe center 66% (Android adaptive)
- [ ] `mobile/assets/splash.png` — 1284×2778 or similar tall aspect, brand-forward

### 2.2 — App Store screenshots
Minimum required device sizes:
- [ ] 6.9" iPhone (1290×2796) — 3 screenshots minimum, 10 max
- [ ] 6.5" iPhone (1284×2778) — required if you support older phones
- [ ] 5.5" iPhone (1242×2208) — required if you support very old phones
- [ ] iPad screenshots — only if `supportsTablet: true` in `app.json` (currently false — skip)

Content: real Miamo screens showing Discover, Match Success, Chat, DTM, Creativity, Profile. Marketing overlays OK.

### 2.3 — Play Store graphics
- [ ] Feature graphic: 1024×500 PNG/JPG (banner shown at top of listing)
- [ ] Phone screenshots: 1080×1920 minimum, 8-max
- [ ] Optional: 7" tablet + 10" tablet screenshots (skip if not targeting tablets)

### 2.4 — App description (copy)
- [ ] Short description (80 chars max, Play Store): "Serious dating for India — matched by behaviour, not just photos."
- [ ] Long description (4000 chars max): feature list — Discover · DTM · Move v2 · Weekly Top 10 · Family Brief · Trust Score
- [ ] Keywords (100 chars, iOS): `dating,india,serious,matrimonial,relationship,love,match,marriage`
- [ ] What's New (release notes, 4000 chars): "v1.0 — initial launch."

---

## §3 — Metadata + legal (from web app)

### 3.1 — Privacy policy URL
- [ ] `https://miamo.app/legal/privacy` returns HTTP 200 with counsel-approved text
- [ ] Text based on [docs/legal/privacy-policy.md](docs/legal/privacy-policy.md) — counsel-reviewed before submission

### 3.2 — Terms of Service URL
- [ ] `https://miamo.app/legal/terms` returns HTTP 200 with counsel-approved text
- [ ] Text based on [docs/legal/terms-of-service.md](docs/legal/terms-of-service.md)

### 3.3 — Support URL
- [ ] `https://miamo.app/support` or a plain email `support@miamo.app` monitored inbox

### 3.4 — Delete-account URL (App Store requirement)
- [ ] Documented path: Settings → Delete Account (typed-confirm gate, 14-table $transaction — already shipped)
- [ ] Also expose a web page `https://miamo.app/legal/delete-account` explaining the process (Google's requirement since 2024)

---

## §4 — Pre-submission engineering gates

### 4.1 — Backend production readiness
- [ ] Every item in [docs/architecture/launch-day-checklist.md](docs/architecture/launch-day-checklist.md) §2 (T-24h) green
- [ ] `POST /api/v1/notifications/register-device` returns 200 under load
- [ ] `NotificationDevice` migration applied to production DB
- [ ] Expo Push SDK integrated into notifications worker (~30 line follow-up — see [MOBILE.md](MOBILE.md) §6)

### 4.2 — Mobile app gates
- [ ] `cd mobile && npm run typecheck` — 0 errors
- [ ] `cd mobile && npm test` — Layers 1+2 pass
- [ ] `cd mobile && npm run test:parity` — all 26 rows locked to screen files
- [ ] `RUN_CONTRACT_TESTS=1 cd mobile && npm run test:contract` — happy paths pass against production backend

### 4.3 — Real-device smoke on preview build
```bash
cd mobile
eas build --profile preview --platform all
```
Install on your iPhone + one Android phone. Run:
- [ ] Sign up → onboarding → 6 photos + prompts → Discover shows real cards
- [ ] Swipe like → match → Move v2 picker shows 5 suggestions → send → Chat opens
- [ ] Message round-trip works
- [ ] DTM answer flow completes
- [ ] Push notification arrives when a match happens (needs Expo Push SDK backend integration)
- [ ] Settings toggle round-trip persists
- [ ] Delete account ceremony works (typed confirm, 14-table wipe)
- [ ] Force-close + reopen → login state persists

### 4.4 — Optional cloud device coverage
- [ ] BrowserStack manual test on iPhone 15 Pro, iPhone SE (3rd gen), Pixel 8, Samsung Galaxy S23 — smoke each critical flow

---

## §5 — Store-specific declarations

### 5.1 — App Store (Apple)
- [ ] Encryption declaration: "No, my app doesn't use encryption beyond standard HTTPS" (unless you added something)
- [ ] IDFA declaration: "No, my app does not use the Advertising Identifier" (Miamo doesn't)
- [ ] Sign in with Apple: required since Miamo offers Google OAuth → **must also implement Apple Sign-In or App Review will reject.** [services/auth/src/server.ts](services/auth/src/server.ts) already has the `/auth/apple` route stub — needs Apple Sign-In key ($99/yr membership included).
- [ ] App Review Information: demo account credentials (create a test user in prod with `email: reviewer@miamo.app`, password stored in Notes → paste in App Review Info)

### 5.2 — Play Store (Google) Data Safety
Miamo collects/shares:
- [ ] Personal info: name, email, phone → collected, encrypted in transit + at rest, user can delete
- [ ] Photos: uploaded → shared with matches only (never with third parties), user can delete
- [ ] Location: precise (via geolocation) → collected, not shared with third parties, user can revoke
- [ ] Messages: content → collected, encrypted, shared only with the message recipient
- [ ] Health & fitness: none
- [ ] Financial info: transaction amount + Razorpay tokens (never card numbers)
- [ ] All data types: Data is encrypted in transit ✓, user can request deletion ✓, user can request export ✓

### 5.3 — Play Store target API level
- [ ] Expo SDK 52 targets Android 14 (API 34) by default — satisfies Play requirement (API 33+ minimum, API 34+ preferred for new apps as of Aug 2024)

---

## §6 — Submission

### 6.1 — Build signed production binaries
```bash
cd mobile
eas build --profile production --platform ios       # ~15 min in cloud
eas build --profile production --platform android   # ~15 min in cloud
```

Download URLs shown at end. Test-install each on your device via TestFlight (iOS) or direct APK sideload (Android) before submitting.

### 6.2 — Submit to App Store
```bash
cd mobile
eas submit --platform ios --profile production
```
- Uploads latest production build to App Store Connect
- In App Store Connect: attach the build to your v1.0 version → submit for review
- Expected timeline: 24-48h for first review

### 6.3 — Submit to Play Store
```bash
cd mobile
eas submit --platform android --profile production
```
- Uploads latest AAB to Play Console production track
- In Play Console: complete rollout percentage (start at 20% if you're cautious, 100% for standard launch)
- Expected timeline: 1-3 days for first review

---

## §7 — First 72h post-launch

Watch for:
- [ ] Crash-free session rate ≥ 99.5% (Sentry or Expo dashboard)
- [ ] Push notification delivery rate — should hit ≥ 90% on iOS, ≥ 85% on Android
- [ ] Store rating — respond to every 1-2 star review within 24h
- [ ] Sign-up conversion — should match web at ±10%
- [ ] Any 4xx from `/api/v1/notifications/register-device` — investigate immediately (silent failure = no pushes for that user)

If crash rate > 1% or a Sev-1 breaks:
- [ ] Ship OTA fix via Expo Updates (no store re-review needed for JS-only fixes): `eas update --branch production`
- [ ] If it's a native issue: `eas build --profile production` + `eas submit` — 24-48h store re-review

---

## §8 — When "launched" is done

- [ ] Both stores show "Available" status
- [ ] 72 hours post-launch with no Sev-1
- [ ] D1 retention measured (compare to web baseline)
- [ ] Push delivery rate healthy
- [ ] Sign-in flow works via both Google and Apple on both platforms

Anything short of all of the above is "in the wild," not "launched."

---

_End of checklist. See [MOBILE.md](MOBILE.md) for daily-dev commands. See [docs/architecture/launch-day-checklist.md](docs/architecture/launch-day-checklist.md) for the web/backend launch ceremony (separate but related to mobile launch)._
