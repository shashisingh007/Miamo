# Cross-Platform + Browser Matrix — Launch-Day Runbook

**Audience:** Launch-team QA lead.
**When used:** T-24h through T+2h of public launch, and again after every point-release.
**How used:** This is a fillable runbook. The 25-cell matrix below starts blank. QA fills each cell with pass / fail / n-a, attaches a screenshot to the referenced path, and adds a note when anything is off.

Do not treat this file as a report of already-completed testing. Cells stay blank on `main` and are populated fresh per release into a copy under `docs/releases/<version>/cross-platform-matrix.md`.

Cross-reference: `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §G.10, `playwright.config.ts` (browser projects), `docs/DEVOPS.md` Appendix P (Playwright install).

---

## 1. The 25-cell matrix

Five browser projects × five user-visible checkpoints. Every cell must be filled before we cut a release.

| Browser \ Checkpoint | 1. Login | 2. Discover | 3. Match modal | 4. DTM answer | 5. Settings |
|---|---|---|---|---|---|
| **Chromium desktop** (1440×900) |  |  |  |  |  |
| **WebKit desktop** (1440×900) |  |  |  |  |  |
| **Firefox desktop** (1440×900) |  |  |  |  |  |
| **Mobile Chrome** (Pixel 5, 393×851) |  |  |  |  |  |
| **Mobile Safari** (iPhone 12, 390×844) |  |  |  |  |  |

### Cell template (paste into each populated cell during launch)

```
status: pass | fail | n-a
screenshot: docs/releases/<version>/screens/<browser>-<checkpoint>.png
notes: <one line — layout ok, gesture ok, keyboard ok, or the exact failure>
```

Legend:
- **pass** — the checkpoint's happy path finished with no visible error and no layout break.
- **fail** — anything the user would notice: dead click, ghost tap, layout shift >0.1 CLS, missing state feedback, keyboard trap.
- **n-a** — the checkpoint doesn't exist on that surface (e.g. mobile-only gesture on desktop).

### Checkpoint definitions

1. **Login** — `/login` → enter credentials → land on `/discover` (or first-run `/onboarding`).
2. **Discover** — `/discover` loads, first candidate renders, swipe left + swipe right + Miamo Move button all work.
3. **Match modal** — after a mutual right-swipe, the celebration modal appears, "Send Move" and "Keep browsing" buttons both work.
4. **DTM answer** — `/dtm` opens, the current topic renders, tap an answer chip, feedback appears within 500 ms, next topic loads.
5. **Settings** — `/settings` loads all sections, toggles persist across reload, language switcher (G.13) changes UI copy immediately.

---

## 2. Running the Playwright matrix

Full 5-browser run:

```bash
# One-time setup (per developer / per CI runner)
cd /path/to/Miamo
npm ci
npx playwright install --with-deps

# Run the full 5-browser matrix
npm run test:e2e
```

Single-browser runs (fast local debug):

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=webkit
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=mobile-chrome
npm run test:e2e -- --project=mobile-safari
```

Interactive UI mode (for capturing new screenshots into the matrix):

```bash
npm run test:e2e:ui
```

Reports:
- HTML report lives in `playwright-report/index.html` after each run.
- On CI, we upload it as a build artifact; on local, open in a browser.

If a cell fails: capture the trace via `npx playwright show-trace test-results/**/trace.zip`, save the screenshot into `docs/releases/<version>/screens/`, and log the failure in the cell notes.

---

## 3. Windows-specific validation

Git Bash under MINGW64 has historically caused three classes of issue we've since fixed:

1. **`bash scripts/start.sh` treating paths as Windows** — fixed via explicit `MSYS_NO_PATHCONV=1` at the top of `scripts/start.sh`. Verify the boot log shows Linux-style `/c/Users/...` paths, not `C:\Users\...`.
2. **`npm run typecheck` failing on `services/*/tsconfig.json` referenced by relative POSIX paths** — fixed by using `path.resolve` inside `scripts/typecheck.mjs`. Verify by running `npm run typecheck` in a fresh Git Bash MINGW64 session — expect 11/11 clean.
3. **Line-ending drift breaking `sh` scripts committed with CRLF** — mitigated by the `.gitattributes` `* text=auto eol=lf` rule. Verify `git config core.autocrlf` returns `input` on Windows contributors' machines.

Windows launch-team checklist:

- [ ] Fresh clone on Windows 11, Git Bash MINGW64 5.x
- [ ] `bash scripts/start.sh local dev` — stack boots green, all 8 services reachable
- [ ] Chrome desktop: full checkpoint 1–5 pass
- [ ] Edge desktop (Chromium engine, but distinct WebView + font rendering): full checkpoint 1–5 pass
- [ ] Firefox desktop on Windows: full checkpoint 1–5 pass
- [ ] Match modal: verify celebration confetti frame-rate ≥50 fps (not the animation-drop we saw once on the Surface Pro)
- [ ] Filter drawer: verify `Escape` key closes it (the older Windows-native keyboard listener bug)
- [ ] Settings toggles: verify every toggle click registers on the first press (no double-click bug)

---

## 4. Real-device validation checklist

Playwright covers layout + basic gesture. Real devices catch what Playwright cannot: safe-area insets, iOS keyboard obstruction, Android system-back gesture, notch behaviour, native scroll physics.

### iPhone (iOS 17+)

- [ ] Login → Discover on cellular (5G disabled → LTE only)
- [ ] Swipe from left screen edge does **not** trigger browser-back mid-swipe on `/discover`
- [ ] Match modal fits above the safe-area inset (no button behind the home-indicator)
- [ ] DTM answer chips are all ≥44×44 pt tap targets
- [ ] Chat send: keyboard does not cover the input field
- [ ] Settings: switching to Hindi keeps the layout intact (no clipped labels)
- [ ] Screen record a full session (Discover → match → chat → back to Discover) — no dropped frames, no white flash on route transitions
- [ ] Portrait + landscape: both work; no orientation-locked layout breaks

### Android (Android 13+)

- [ ] Login → Discover on Chrome Android
- [ ] System-back gesture on `/discover` returns to `/matches` (or `/`), not out of the app entirely
- [ ] Match modal celebration confetti runs at ≥50 fps on mid-tier phones (Pixel 6a class)
- [ ] Chat: attach-photo picker returns to the app cleanly (no state loss)
- [ ] Notification permission prompt: shown once at the right moment (after first match, not on load)
- [ ] Vibration API: match-modal haptic fires (if user enabled haptics in settings)
- [ ] Dark mode: follows system setting; no white flash on route transitions

### iPad landscape (1024×768 or larger)

- [ ] Discover grid does not collapse to single column
- [ ] Match modal centred, not stretched full-width
- [ ] Chat has correct two-pane layout (list left, thread right) rather than mobile single-pane
- [ ] Settings sidebar remains visible; sections render in the right pane

### Android tablet (10-inch landscape)

- [ ] Same layout checks as iPad landscape
- [ ] Split-screen with another app: Miamo does not lose scroll state

---

## 5. Slow-network throttle validation

Every route must be usable under a 4G-slow throttle. We simulate this via Chrome DevTools:

**Throttle profile:** Custom
- **Download:** 4 Mbps (4,000 kbps)
- **Upload:** 400 kbps
- **Latency:** 100 ms RTT

**How to configure in Chrome DevTools:**

1. Open DevTools → Network tab
2. In the throttling dropdown (top-right), select "Add..."
3. Create profile named "4G-slow-launch"
4. Fill: download 4000, upload 400, latency 100
5. Select the profile from the dropdown

**Assertion targets under throttle:**

- [ ] p95 First Contentful Paint on `/discover` < 3 s (per Phase G.10 spec)
- [ ] p95 Largest Contentful Paint on `/discover` < 4 s
- [ ] Login → Discover total time-to-interactive < 6 s
- [ ] Discover swipe: photo of *next* card is preloaded before user reaches it (verify via Network tab — no stall between swipes)
- [ ] Match modal renders in < 2 s after mutual match on the server side
- [ ] Chat send: message appears in the thread within 300 ms (optimistic UI), not after the round-trip
- [ ] DTM: next topic loads in < 1 s after answer submit
- [ ] Settings: no toggle stalls > 300 ms

**Zero-network dry-run (offline):**

- [ ] Set DevTools → Offline
- [ ] Every route should show a designed offline state, not a browser-default "no internet" screen
- [ ] Optimistic UI must not silently discard unsent messages when back online

---

## 6. Sign-off

The launch is blocked until:

- 25/25 cells in §1 are filled with pass or documented n-a
- Windows §3 checklist is fully checked
- Real-device §4 has at least one iPhone + one Android verified by a human
- Slow-network §5 assertions all pass

QA lead signs the release ticket with a link to the populated copy of this file under `docs/releases/<version>/cross-platform-matrix.md`.

---

_This runbook is intentionally not marked complete on `main`. It exists to be copied and filled per release. If you're reading this on `main` and thinking "the cells are empty," that's by design — see the release copy for the current status._
