# Moderation Pipeline

**Status:** launch scaffold — image moderation is a stub until AWS Rekognition credentials land; text moderation is live behind `FEATURE_TEXT_MODERATION_ENABLED=1` (default OFF).

**Purpose:** every user-generated string and every user-uploaded image flows through a moderation check before it becomes visible to another user. This document is the map of that flow — the categories we detect, the SLAs we hold ourselves to, the appeal path.

Cross-references:
- Code: `services/shared/src/moderation/{types,imageModerationClient,textModerationClient}.ts`
- Tests: `tests/moderation/{imageModerationClient,textModerationClient}.test.ts`
- Callers: `services/content/src/server.ts` (POST creativity items), `services/messaging/src/server.ts` (POST message)
- Legal: `docs/legal/terms-of-service.md`, `docs/legal/privacy-policy.md`
- Spec: `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §G.11

---

## 1. Category taxonomy

The `ModerationCategory` enum in `types.ts` is the single source of truth. Every fired category maps here:

| Category | Description | Severity default | Notes |
|---|---|---|---|
| `nudity` | Explicit sexual content | hard | Suggestive-only can be soft |
| `violence` | Blood, weapons drawn, self-harm imagery | hard | Visually-disturbing-only can be soft |
| `drugs` | Illegal drugs, drug paraphernalia | hard | Alcohol / tobacco surface as soft only |
| `weapons` | Firearms, knives brandished at humans | hard | Detected via object detection in Phase H |
| `hate_symbols` | Nazi imagery, KKK, ISIS flags, etc. | hard | Rekognition top-level category |
| `csam` | Child sexual abuse material | hard | Never soft. Auto-escalates to admin review. |
| `spam` | Commercial spam, repeat-character noise | soft | Repeated offences escalate |
| `slur` | Racial / casteist / homophobic / ableist slur | hard | Tier-1 hard, tier-2 soft |
| `doxxing` | Personal contact info shared without consent | soft | Phone / email / off-platform handle |
| `other` | Anything else that fires but doesn't map above | varies | Bucket for policy expansion |

---

## 2. Pipelines

### 2.1 Image moderation pipeline

```
┌──────────────┐  1  ┌──────────────┐  2  ┌────────────────────┐  3  ┌──────────────┐
│  Upload API  │────▶│ KeywordMod   │────▶│ AwsRekognitionMod  │────▶│ Persist +    │
│              │     │ (URL patterns│     │ (categories + conf)│     │ surface      │
└──────────────┘     └──────────────┘     └────────────────────┘     └──────────────┘
                            │                       │                         ▲
                            │ hard-reject           │ hard-reject             │
                            │                       │                         │
                            └───────► REJECT ◀──────┘                         │
                                                                              │
                            approve ─────────────────────────────────────────┘
```

1. **KeywordModerator** (in-memory, ~1 µs): URL against a small blocklist of known-bad hosts / patterns. Catches instant bans without waiting for a cloud round-trip.
2. **AwsRekognitionModerator** (external, p95 <400 ms): `DetectModerationLabels` API. Iterates returned labels, looks up each in the per-category threshold table (`REKOGNITION_THRESHOLDS` in `imageModerationClient.ts`), returns the highest-severity match.
3. **Persist**: if approved, the URL is written into the content record + surfaced. If rejected, we save the moderation decision (categories + confidence + reason) alongside the record with `status='rejected'` and never surface it. Hard rejections create an audit-log entry.

**Fail-open policy:** if AWS Rekognition times out or errors, we log + treat as approved. Rationale: a Rekognition outage must not stall content upload for millions of users. Every fail-open is audit-logged so an on-call engineer can spot patterns.

### 2.2 Text moderation pipeline

Runs entirely in memory — no external calls. Five layers, evaluated in order (`DefaultTextModerator.moderateText`):

1. **Empty / trivial** → approve
2. **Spam heuristics** — repeated characters, all-caps > 60 chars, repeated words → soft-block (`spam`)
3. **Tier-1 slur list** — 22 entries (English + Hindi/Roman + Tamil/Roman transliterations) → hard-block (`slur`). CSAM-adjacent tokens (`lolita`, `preteen`) escalate to `csam`.
4. **Tier-2 slur list** — 11 mild insults → soft-block (`slur`)
5. **Doxxing patterns** — Indian phone (with/without +91), email, whatsapp/telegram/insta solicitation → soft-block (`doxxing`)

**Normalisation:** the moderator folds leetspeak (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, !→i, @→a, $→s), strips diacritics + punctuation, tokenises on whitespace, and matches whole tokens only. This avoids the Scunthorpe problem.

---

## 3. Call-site wiring

Both wires are behind `FEATURE_TEXT_MODERATION_ENABLED=1` (default OFF).

### `services/content/src/server.ts` — POST `/api/v1/creativity/items`
- Combines `title` + `content` + `description` and runs the moderator once.
- **Hard hit** → `422 CONTENT_REJECTED` + `auditLog('moderation.creativity.hard_block')`
- **Soft hit** → `400 CONTENT_NEEDS_EDIT` (severity: soft) — client shows an inline "please edit before publishing" panel.
- We reject BEFORE the Spotlight-minute spend so bad posts don't burn minutes.

### `services/messaging/src/server.ts` — POST `/api/v1/messages/chats/:chatId/messages`
- Runs the moderator on `content` immediately after the empty-content check.
- Same 422 / 400 split.
- We reject BEFORE the anti-ghost deposit so bad first-messages don't burn deposits.

Both call-sites are additive: when the flag is OFF, the moderator is not invoked and the byte-identical pre-G.11 behaviour is preserved.

---

## 4. Report + block flow (interface, admin UI in Phase F)

- **User taps ⋯ on a profile / message / post** → picks a reason (one of the 12 canonical categories above) → optionally adds free-text (≤500 chars) → submits.
- API creates a `Report` row with `reporterId`, `targetType` (`user` / `message` / `post`), `targetId`, `category`, `notes`, `createdAt`.
- The reporter is IMMEDIATELY blocked from seeing the reported user's content (Discover, matches, messages, search — bidirectional invisibility).
- The report enters an admin queue (this session builds the API; the admin UI is a Phase F deliverable).

### Rate-abuse

- Same user files > 20 reports in 24h → reporter is auto-flagged for review (weighted-karma system, TBD Phase H).
- Same profile is reported by > 5 distinct users → target is auto-hidden pending review.

### Under-18 detection

Multi-signal:
1. Profile `age < 18` — schema-level reject (already enforced)
2. Photo age classifier confidence — Phase H (needs Rekognition credentials)
3. Phone-number country + age laws — Phase H (needs country → age-of-consent table)
4. IP + language cues — Phase H (needs geoip pipeline)

Any single strong signal soft-suspends the account and requires ID verification to reactivate.

---

## 5. SLA

| Event | Target |
|---|---|
| Report submitted → hidden from reporter | < 1 s (synchronous in the same request) |
| Report submitted → admin review | ≤ 24 h |
| Hard-block audit-log write | < 100 ms (fire-and-forget, does not block the response) |
| CSAM detection → account suspend | < 1 h (auto, no human in loop) |
| Appeal decision (user contests a hard block) | ≤ 72 h |
| Legal request (subpoena, LEA request) → response | per counsel; queue in Zendesk with `legal` tag |

---

## 6. Appeal flow

Users who receive a hard block can appeal:

1. Toast at rejection time: "This post was blocked. [Learn why] [Appeal]"
2. `[Learn why]` links to `/help/moderation-why` — a plain-English list of the categories that fired (never the specific rule matched — that leaks moderation surface area).
3. `[Appeal]` opens a form that captures the user's explanation + posts to `POST /api/v1/moderation/appeals`.
4. Appeals land in the same admin queue as reports, tagged `appeal`. SLA: 72 h.
5. Overturned appeals restore the content + credit any burned Spotlight minutes.

---

## 7. Escalation path

- **On-call (0–2 h response):** the moderation flag itself (`FEATURE_TEXT_MODERATION_ENABLED`) can be toggled off in <60 s if it starts false-positive-storming users. `docs/RUNBOOK.md` Appendix M.
- **Ops lead (P1 / 2–8 h):** repeated hard-block false positives on legitimate content, admin-queue backlog > 1000, Rekognition outage > 30 min.
- **Legal (P0 / < 24 h):** any CSAM detection, LEA request, court order, DMCA takedown.
- **Founder (P0):** any moderation decision that reaches press, regulator, or supervisory-authority attention.

---

## 8. Metrics we watch

- `moderation.text.blocked{severity, category}` — counter per outcome
- `moderation.text.latency_ms` — p50/p95/p99
- `moderation.image.fail_open_total` — every Rekognition timeout that fell through
- `moderation.reports.created{category}` — counter per user-submitted report
- `moderation.appeals.opened` — counter
- `moderation.appeals.overturned` — counter (target: > 5% would flag over-blocking)

Wired via `services/shared/src/metrics.ts` in Phase H alongside the Prometheus exporter roll-out.

---

## 9. Known gaps (deferred to Phase H)

- **Image classifier** — the AWS SDK is not wired yet; only the abstraction is real
- **Toxicity classifier** — Perspective API (or equivalent) behind `PERSPECTIVE_API_ENABLED=1` — replaces the tier-2 heuristic
- **Real-time voice/video moderation** — n-a for launch, out of scope
- **Screenshot / screen-record detection** — browser API is limited (Visual Effect API on iOS Safari, `visibilitychange` on Android Chrome). We log the transition and warn the counterparty; we cannot prevent the capture.
- **Admin UI** — the report-queue UI is a Phase F deliverable; this session builds the API only.
