# Phase QA Run — Summary (2026-06-09)

Aggregated outcome of `docs/QA_MASTER_PROMPT.md` phases 0 → 12 executed against
a live local stack (Colima Docker · Postgres 16 · Redis 7 · 50 seeded users).

## Final state

| Phase | Script | Events | Signatures | Notes |
| ----- | ------ | -----: | ---------: | ----- |
| 0 — pre-flight       | docker + 9 ports + 50 seeds + gateway health | 0 | 0 | all green |
| 1-2 — endpoint sweep | `phase-1-2-endpoint-sweep.py` | 0 | 0 | 4 personas × ~37 endpoints |
| 3-4 — Discover + DTM | `phase-3-4-discover-dtm.py`  | 0 | 0 | filters round-trip, DTM 50≈50 |
| 10 — algorithm + learning loop | `phase-10-learning-loop.py` | 0 | 0 | ranker top-5 stable, aiPicks reorders, negative-signal exclusion |
| 11 — cold-start gauntlet | `phase-11-cold-start.py` | 0 | 0 | OTP signup → 95 profile → +5 first-post → match |
| 12 — final regression | `npm test`, `npm run typecheck`, all phase scripts | 0 | 0 | 21 files / 152 tests; 11/11 packages |
| 13 — Creativity reels (v3.5) | `phase-13-creativity-reels.py` | 0 | 0 | reels, react/comment/share, dislike/report/hide-author, move-suggestions, earn-opps |
| 14 — v3.6.0 overhaul (multi-user) | `phase-14-overhaul.py` | 0 | 0 | 4 personas (Priya/Arjun/Riya/Karan); 12 phases A-L covering pass-hard-filter, settings consent, v8 ranker baseline, Move v2, Family Brief, Weekly Top-10, Why-am-I-seeing, anti-ghost, cascade, negative-signal, concurrent stress |

## Code fixes shipped this run

1. **`services/social/src/server.ts:1106`** — `/discover/pass` destructure of the wrong field name; every Pass was a no-op so passed users kept reappearing in `/discover` and `negative-signal-engine` never observed a pass. Dual-read `toUserId || userId`.
2. **`services/social/src/server.ts:1126`** — same fix on `/discover/pass-feedback`; error message normalized to "toUserId and reason required".
3. **`services/social/src/server.ts:1292`** — `PUT /discover/filters` allowlist replaced with `FIELD_MAP` that translates API names → Prisma columns. Was P2009 → 500 on every PUT.
4. **`services/shared/algorithms.ts`** — added `stableJitter(viewerId, candidateId, windowMs=5min)` (FNV-1a); replaced `Math.random()*3` in `scoreForYou` and `Math.random()*2` in `scoreVerified`. Ranker top 5 is now stable for the same viewer within a 5-minute window.
5. **`services/shared/src/schemas.ts`** — `passFeedbackBodySchema` now accepts both `toUserId` (canonical) and `userId` (legacy) via `.refine`.
6. **`services/content/tsconfig.json`** — excluded `../shared/src/verification.ts` from content's typecheck (content's local Prisma schema lacks `Otp` / `TrustedDevice`; the helpers were unused there).
7. **`services/web/src/lib/api.ts`** — widened `browseMatrimonial*` param type to `string | number | boolean` with `String()` coercion in the helper; fixes 8 TS errors in `serious-mode/page.tsx`.

## Reports

Persistent per-phase JSON reports live alongside the scripts:

- `scripts/qa-runs/phase-1-2-endpoint-sweep.report.json`
- `scripts/qa-runs/phase-3-4-discover-dtm.report.json`
- `scripts/qa-runs/phase-10-learning-loop.report.json`
- `scripts/qa-runs/phase-11-cold-start.report.json`
- `scripts/qa-runs/phase-13-creativity-reels.report.json`
- `scripts/qa-runs/phase-14-overhaul.report.json`

## How to re-run

```bash
# pre-flight
docker compose up -d
bash scripts/start.sh local start

# regression
npm test
npm run typecheck

# phases (pace ~30s between to avoid gateway rate limit)
python3 scripts/qa-runs/phase-1-2-endpoint-sweep.py
python3 scripts/qa-runs/phase-3-4-discover-dtm.py
python3 scripts/qa-runs/phase-10-learning-loop.py
python3 scripts/qa-runs/phase-11-cold-start.py
python3 scripts/qa-runs/phase-13-creativity-reels.py
python3 scripts/qa-runs/phase-14-overhaul.py
```

All four phase scripts have a built-in 429 back-off (3 attempts, exponential)
but the first call to a hot endpoint can still trip the gateway limiter if you
chain them with zero sleep.
