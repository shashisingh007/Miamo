# Miamo Mobile — Founder's Guide

**Stack:** Expo SDK 52 (React Native 0.76) + TypeScript + EAS Build/Submit.
**Why Expo:** you don't need Xcode or Android Studio installed locally. You develop with **Expo Go** on your phone (free App Store / Play Store app) and build/submit to the stores from Expo's cloud (EAS).

Everything the web app does at [services/web/](services/web/) works on iOS + Android via the mobile codebase at [mobile/](mobile/). Feature parity is regression-locked by [mobile/tests/feature-parity.test.ts](mobile/tests/feature-parity.test.ts) — every row of [mobile/FEATURE_PARITY_MATRIX.md](mobile/FEATURE_PARITY_MATRIX.md) has a matching screen file.

---

## §1 — One-time setup on your Mac (~15 min)

```bash
# From /Users/singhshs/Downloads/Miamo/
brew install node                                            # if not already installed
npm install -g eas-cli                                       # EAS Build CLI
cd mobile
npm install --legacy-peer-deps                               # installs Expo + all mobile deps (~2 min)
```

Install **Expo Go** on your phone:
- iPhone: https://apps.apple.com/app/expo-go/id982107779
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent

Create a free Expo account at https://expo.dev → `eas login` on your Mac. Then in [mobile/app.json](mobile/app.json) replace the placeholder `REPLACE_WITH_YOUR_EAS_PROJECT_ID` with the id shown by `eas init`.

---

## §2 — Daily development loop

```bash
# Terminal 1 — start the Miamo backend (11 services)
bash scripts/start.sh local start

# Terminal 2 — start the mobile bundler
cd mobile
EXPO_PUBLIC_API_URL=http://<your-mac-lan-ip>:3200 npx expo start
```

A QR code appears. On your **phone**:
- iPhone: open Camera → point at QR → tap the banner → Expo Go launches Miamo
- Android: open Expo Go → Scan QR code

Every save on your Mac hot-reloads on your phone in ~1s. `<your-mac-lan-ip>` is what `ipconfig getifaddr en0` returns — the app on your phone reaches the backend running on your Mac via LAN.

---

## §3 — Testing (4 layers)

```bash
cd mobile

npm run typecheck                                            # TS strict — 0 errors
npm run lint                                                 # ESLint

npm run test:unit                                            # Layer 1 — Jest unit tests (api, stores, hooks, utils)
npm run test:component                                       # Layer 2 — RNTL component tests
npm run test:parity                                          # Feature parity gate — every row of the matrix has a screen

# Layer 3 — Contract tests against live backend (need backend running)
RUN_CONTRACT_TESTS=1 MIAMO_API_URL=http://localhost:3200 npm run test:contract

# Layer 4 — Detox E2E on iOS simulator / Android emulator
# Only runs on a Mac with Xcode + Android Studio. Skip for cloud testing.
npm run e2e:build:ios && npm run e2e:test:ios
```

Contract tests hit the real backend, so they catch schema drift. Component tests are hermetic (fetch mocked). Unit tests are pure functions. E2E tests are optional — for cloud device coverage use BrowserStack (§7).

---

## §4 — Building for the App Store + Play Store (EAS Build)

You never open Xcode or Android Studio. Everything happens in Expo's cloud.

```bash
cd mobile

# Development build — ad-hoc install with debug tools (yourself only)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build — shareable install link, points to sandbox backend
eas build --profile preview --platform all

# Production build — points to production backend, submits to stores
eas build --profile production --platform all
```

Each build runs ~10-15 min in Expo's cloud. When done you get a download URL for the `.ipa` / `.apk` / `.aab`. The free EAS tier gives you 30 builds/month — plenty for pre-launch.

Config lives in [mobile/eas.json](mobile/eas.json). Environment variables per profile:
- development / preview → `EXPO_PUBLIC_API_URL=https://sandbox.miamo.app`
- production → `EXPO_PUBLIC_API_URL=https://api.miamo.app`

---

## §5 — Submitting to the stores (EAS Submit)

Prerequisites (see [MOBILE_LAUNCH_CHECKLIST.md](MOBILE_LAUNCH_CHECKLIST.md)):
- Apple Developer Program membership ($99/yr) + App Store Connect app record
- Google Play Console developer account ($25 one-time) + service account JSON

```bash
cd mobile

# iOS — uploads latest production build to TestFlight, then to review
eas submit --platform ios --profile production

# Android — uploads latest production AAB to Play Console production track
eas submit --platform android --profile production
```

Submission takes ~5 min. Then:
- App Store review: 24-48h (usually)
- Play Store review: 1-3 days
- Both first-time reviews can take longer if metadata is incomplete

---

## §6 — Push notifications (Expo Push)

The mobile app registers each device's Expo push token on cold start via [mobile/src/lib/push.ts](mobile/src/lib/push.ts) — POSTs to `/api/v1/notifications/register-device` (backend at [services/notifications/src/server.ts](services/notifications/src/server.ts:218)). The Prisma `NotificationDevice` model stores `platform + token + userId + lastSeenAt + revoked`.

To send a push from the backend:

```ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';   // add to services/notifications later
const expo = new Expo();
const devices = await prisma.notificationDevice.findMany({ where: { userId, revoked: false } });
const messages: ExpoPushMessage[] = devices.map(d => ({
  to: d.token,
  title: 'You have a new match!',
  body: 'Tap to view.',
  data: { screen: 'Matches' },
  sound: 'default',
}));
const chunks = expo.chunkPushNotifications(messages);
for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
```

This wiring is deferred to a follow-up session — the register-device endpoint + Prisma model + client-side token retrieval are all shipped and tested. The dispatch worker is a ~30-line addition when you're ready.

---

## §7 — Cloud device testing (no Mac hardware needed)

If you want to test on real iPhones/Androids without owning them:

| Service | Free tier | Use case |
|---|---|---|
| **BrowserStack App Live** | 100 min/mo | Manual test on real iPhone 15, Pixel 8 |
| **Firebase Test Lab** | 10 tests/day | Automated Detox on real Google-hosted devices |
| **AWS Device Farm** | 250 min first month | Automated cross-device |

Upload the EAS-built `.ipa` / `.apk` and drive manually or via Detox specs from [mobile/tests/e2e/](mobile/tests/e2e/).

---

## §8 — Repo map

- [mobile/App.tsx](mobile/App.tsx) — root entry
- [mobile/app.json](mobile/app.json) — Expo config
- [mobile/eas.json](mobile/eas.json) — EAS Build/Submit profiles
- [mobile/src/lib/api.ts](mobile/src/lib/api.ts) — mobile API client (port of [services/web/src/lib/api.ts](services/web/src/lib/api.ts))
- [mobile/src/lib/push.ts](mobile/src/lib/push.ts) — Expo push registration
- [mobile/src/stores/](mobile/src/stores/) — zustand stores (auth, discover, matches, messages, settings)
- [mobile/src/hooks/](mobile/src/hooks/) — useAuth, useTrackActivity
- [mobile/src/navigation/AppNavigator.tsx](mobile/src/navigation/AppNavigator.tsx) — bottom tabs + stack
- [mobile/src/screens/](mobile/src/screens/) — 30 screens (all 26 web routes + 4 sub-screens)
- [mobile/src/components/](mobile/src/components/) — 15 shared components
- [mobile/tests/](mobile/tests/) — 4-layer test suite

---

## §9 — Troubleshooting

**"Metro bundler failed to start"** → `cd mobile && rm -rf node_modules && npm install --legacy-peer-deps`.
**"Cannot find module '@lib/api'"** → babel path aliases; run `npx expo start --clear` to bust cache.
**Phone shows "Network request failed"** → the backend URL in `EXPO_PUBLIC_API_URL` must be your Mac's LAN IP (not `localhost`), and your phone must be on the same Wi-Fi.
**EAS Build fails on `pod install`** → transient; rerun `eas build --clear-cache`.
**"Expo Go doesn't support this feature"** → happens with some native modules; use `eas build --profile development` to get a dev-client build that has the module.

---

_End of guide. When you hit something not covered here, open [MOBILE_LAUNCH_CHECKLIST.md](MOBILE_LAUNCH_CHECKLIST.md) for the store-submission ceremony, or [HANDOFF.md](HANDOFF.md) for the broader project state._
