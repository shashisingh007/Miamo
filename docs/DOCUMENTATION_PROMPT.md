# Miamo Documentation Rewrite Prompt (v2 — "Explain it to my mom, then to my CTO")

> **Mission**: Rewrite every Markdown doc in this repo so a **non-technical person**
> (a parent, a designer, a new PM) can read it top-to-bottom and understand
> *what the thing is, what it does, how it works, why we built it that way,
> and what happens when they tap a button* — while a **senior engineer**
> still gets enough technical depth (env vars, file paths, endpoints, flags)
> to operate it.
>
> If a sentence cannot be understood by a smart 15-year-old without Googling,
> rewrite it.

---

## 0. Files in scope (rewrite ALL of these)

```
README.md
MIAMO.md
docs/ARCHITECTURE.md
docs/FRONTEND.md
docs/ALGORITHMS.md
docs/TRACKING.md
docs/DEVOPS.md
docs/SECURITY.md
docs/RUNBOOK.md
services/auth/README.md
services/users/README.md
services/social/README.md
services/messaging/README.md
services/content/README.md
services/notifications/README.md
services/gateway/README.md
services/ingest/README.md
services/tracking-worker/README.md
services/shared/README.md
services/web/README.md
```

Keep this file (`docs/DOCUMENTATION_PROMPT.md`) as-is — it is the recipe.

---

## 1. The Golden Rules (non-negotiable)

1. **Lead with a story, not a system.** The first 5 lines of every doc must
   describe a real human moment ("Priya opens Miamo at 9pm, taps a profile…")
   *before* any technology word appears.
2. **No undefined jargon, ever.** The first time you use a technical word
   (JWT, Redis, Stream, HMAC, embedding, cosine similarity, HPA, Prisma,
   SSE, rate-limit, idempotency…) you MUST immediately explain it in a
   parenthesis using a real-world analogy. Example:
   - Good: "We use **JWT** (a tamper-proof wristband the server stamps on
     you at login — anyone can read it, nobody can forge it)…"
   - Bad: "Auth issues a JWT with 15m TTL."
3. **Show the path of one tap.** Every service/feature doc must include at
   least one **"What happens when the user taps X"** numbered walkthrough,
   step by step, with timings ("~40ms"), naming each hop.
4. **Use real numbers, real names, real data.** Never write `userA` and
   `userB`. Use `Priya (28, Mumbai, loves trekking)` and
   `Arjun (30, Bangalore, photographer)`. Carry the same characters across
   all docs so the reader builds a mental model.
5. **Every formula gets a worked example with actual arithmetic.** If you
   write `score = 0.4·a + 0.3·b`, the next line shows
   `score = 0.4·0.82 + 0.3·0.55 = 0.328 + 0.165 = 0.493`.
6. **Every doc ends with two sections**:
   - **"What changed and why it's better"** — Before / After / Why-the-user-feels-it.
   - **"If something breaks"** — 3 most likely failure modes in plain
     English and the one-line fix.
7. **No emojis. No marketing fluff** ("blazing fast", "next-gen",
   "world-class", "seamless"). Concrete verbs only.
8. **Diagrams are mandatory** in `MIAMO.md`, every `docs/*.md`, and every
   service README. Use Mermaid (`flowchart`, `sequenceDiagram`). Diagrams
   must use the real character names from rule 4.
9. **Every link must resolve.** Every env var must exist in code. Every
   endpoint must exist in a router. Run `grep` to verify before writing.
10. **No TODO, TBD, "coming soon", "in progress".** If it isn't real,
    don't document it.

---

## 2. The two recurring characters (use everywhere)

| Name      | Age | City      | Vibe                             | Used for                          |
|-----------|-----|-----------|----------------------------------|-----------------------------------|
| **Priya** | 28  | Mumbai    | Trekker, vegetarian, early bird  | The "viewer" in every example     |
| **Arjun** | 30  | Bangalore | Photographer, foodie, night owl  | The "candidate" in every example  |

Optional supporting cast (only if needed): **Meera** (32, Delhi, doctor)
for matches, **Rohan** (27, Pune, gamer) for negative examples.

---

## 3. The 11-section template (every service README uses this, verbatim headings)

```markdown
# <service-name>

> One sentence: what real-world job this service does for Priya, in plain English.

## 1. The story (60 seconds)
A paragraph telling what happens for Priya when this service is doing its job.
No tech words yet.

## 2. What this service is (in one picture)
A Mermaid diagram with Priya on the left, Arjun on the right, this service
in the middle, and arrows labelled in plain English ("ask for matches",
"save the like", "tell the phone").

## 3. What it can do (the menu)
A table: every public endpoint as a row.
| When Priya does this… | …the app calls           | …and gets back               | Source |
|-----------------------|--------------------------|------------------------------|--------|
| Taps "Like" on Arjun  | `POST /social/like`      | `{matched: true, chatId}`    | [src](services/social/src/server.ts) |

## 4. The data it remembers
Plain-English list of the Prisma tables this service owns, one line each:
"`Match` — one row per pair of people who liked each other."

## 5. Who it talks to
Bulleted list of other services it calls and why, in human terms.

## 6. The knobs (configuration)
Table of every env var: name, what it does in plain English, example value,
"what breaks if it's wrong".

## 7. A real example, end-to-end
Numbered walkthrough of one real action with actual curl commands AND a
plain-English narration above each command:
> "Priya's phone asks the gateway for her next 10 profiles."
> ```bash
> curl -H 'authorization: Bearer eyJ…' http://localhost:3200/social/discover?limit=10
> ```
> "The gateway forwards to social, which scores 200 candidates and returns the top 10."
Include the **actual JSON response** trimmed to the interesting fields.

## 8. Run it on your laptop
The 3-line copy-paste block that boots just this service locally.

## 9. How we know it works (tests)
One sentence per test file: "`auth.test.ts` — checks that a wrong password
is rejected and a right password gives a token."

## 10. If something breaks
Three most-likely failures in plain English with the one-line fix.

## 11. What changed and why it's better
- **Before:** what the user/operator experienced before this version.
- **After:** what they experience now.
- **Why Priya feels it:** the one concrete improvement she would notice.
```

---

## 4. Special instructions per cross-cutting doc

### `README.md` (root, ~120 lines)
- Opens with: "Miamo is a dating app. This file tells you, in 2 minutes,
  what's in this repo and where to read next."
- Includes the **5-minute quickstart** (`docker compose up`, login URL,
  demo user, password).
- A single mermaid showing the 10 services and the user's phone.
- "Where do I read next?" table linking every other doc with a one-line
  description of who should read it.

### `MIAMO.md` (master, ~400 lines)
- Treat this as the **book**. A non-tech reader should be able to read
  only this file and understand the whole product.
- Sections in order: *The product in 60 seconds → The 9 screens Priya
  sees → What happens behind every tap (a full sequence diagram with
  timings) → The 17 algorithms in plain English (one paragraph each,
  no math) → The tracking system in plain English (with a real "Priya
  scrolls for 30 seconds" timeline) → How we keep her data safe → How
  we run it in production → Glossary of every tech word used in the
  repo, defined in one line each → What changed and why it's better.*
- The "what happens behind every tap" section must walk through
  **swipe**, **send message**, **open feed**, **get notification** —
  four full sequence diagrams.

### `docs/ALGORITHMS.md` (~300 lines)
- For each of the 17 algorithms:
  1. **What it decides** (one sentence: "who shows up first on Priya's
     discover screen").
  2. **The intuition** (a kitchen analogy: "like a chef who balances
     spice, salt, and sweetness — we balance compatibility, freshness,
     and activity").
  3. **The inputs** (real values for Priya and Arjun).
  4. **The math, one step at a time** with actual arithmetic, ending in
     a final number.
  5. **What this number means for the user** ("Arjun scores 0.78, so he
     appears at position 2 of 10").
  6. **The knob** (which env flag turns it on/off).
- Open with a single table: algorithm | screen it powers | flag |
  "one-line reason it exists".

### `docs/TRACKING.md` (~250 lines)
- Open with a **real timeline**: "9:02:14pm Priya opens the app. 9:02:15
  she sees Arjun. 9:02:18 she taps his photo. 9:02:31 she likes him." —
  then show what event is fired at each tick, what bucket it lands in,
  and when the worker reads it.
- Explain HMAC hashing as: "we don't store 'Priya' — we store a
  fingerprint of 'Priya' that we can compare but nobody can reverse".
- Explain Redis Stream as: "a conveyor belt — the phone drops events
  on one end, the worker picks them off the other end in order, even
  if it was offline for a while".
- Include the **15-minute rollup** with a concrete before/after row
  count ("3,142 raw events → 84 aggregated rows").

### `docs/ARCHITECTURE.md` (~200 lines)
- One big mermaid diagram: phone → gateway → 8 services → postgres/redis.
- For each box: one sentence on what it owns.
- Section: "Why we split it this way" — the four reasons in plain
  English (independent deploy, blast radius, scale hot services alone,
  team ownership).

### `docs/FRONTEND.md` (~250 lines)
- Walk through each of the 9 screens with the route, the components,
  and the data calls.
- Explain App Router, route groups, and SSR in plain English.

### `docs/DEVOPS.md` (~200 lines)
- "How we go from your laptop to a million users" — local → docker →
  kubernetes, three stages, each with the one command that does it.
- Explain HPA as "an elastic — when CPU goes above 70%, kubernetes
  adds more copies of the service automatically; when traffic drops,
  it removes them".

### `docs/SECURITY.md` (~200 lines)
- Frame as "the 7 doors a hacker would try, and what stops them at
  each": password, session, service-to-service, rate-limit, message
  contents, database access, secrets.
- For each: the attack in plain English, the defence, the file where
  the defence lives.

### `docs/RUNBOOK.md` (~180 lines)
- The 10 most likely production incidents, each as: **Symptom** →
  **First thing to check** → **Likely cause** → **Fix command** →
  **How to prevent next time**.

---

## 5. Worked-example budget (must hit these minimums)

| Doc                       | Min stories | Min diagrams | Min worked arithmetic blocks |
|---------------------------|------------:|-------------:|-----------------------------:|
| MIAMO.md                  | 4           | 5            | 2                            |
| docs/ALGORITHMS.md        | 17          | 1            | 17 (one per algo)            |
| docs/TRACKING.md          | 1 timeline  | 2            | 1 (rollup math)              |
| docs/ARCHITECTURE.md      | 1           | 2            | 0                            |
| docs/FRONTEND.md          | 9 (screens) | 1            | 0                            |
| docs/DEVOPS.md            | 1           | 1            | 1 (HPA scaling math)         |
| docs/SECURITY.md          | 7           | 1            | 0                            |
| docs/RUNBOOK.md           | 10          | 0            | 0                            |
| Each service README       | 1           | 1            | 0–1                          |

---

## 6. Style checklist (apply to every doc before saving)

- [ ] First 5 lines tell a human story, no tech words.
- [ ] Every tech term is defined in parenthesis on first use, with an analogy.
- [ ] Priya and Arjun appear in at least one example.
- [ ] At least one Mermaid diagram.
- [ ] At least one numbered "what happens when…" walkthrough with timings.
- [ ] Every formula has worked arithmetic with real numbers.
- [ ] Every env var, endpoint, flag, file path was grep-verified to exist.
- [ ] Every internal link resolves to a real file.
- [ ] No emojis. No "blazing", "seamless", "next-gen", "world-class".
- [ ] No TODO, TBD, "coming soon".
- [ ] Closes with **"What changed and why it's better"** (Before / After / Why Priya feels it).
- [ ] Closes with **"If something breaks"** (3 failure modes, 1-line fixes).
- [ ] A non-tech friend can read it and explain the doc back to you.

---

## 7. Execution order (suggested)

1. Run the three Explore subagents in parallel to refresh the factsheets
   (backend services, web+shared, devops+infra) — gives you the ground
   truth to write from.
2. Rewrite `MIAMO.md` first — it is the spine; the rest reference it.
3. Rewrite the 8 cross-cutting `docs/*.md` files in parallel.
4. Rewrite the 11 `services/*/README.md` files in parallel, using the
   template in §3 verbatim.
5. Rewrite `README.md` last — it links to everything else.
6. Verify: `grep -RIn "TODO\|TBD\|coming soon\|blazing\|seamless\|next-gen" README.md MIAMO.md docs services/*/README.md`
   should return nothing.
7. Verify: read `MIAMO.md` out loud to a non-tech person — if they get
   confused at any sentence, rewrite that sentence.

---

## 8. Definition of done

A new joiner who has never seen the repo can, after reading only
`README.md` and `MIAMO.md`:

1. Explain in their own words what Miamo does.
2. Draw the architecture on a whiteboard.
3. Name 3 of the 17 algorithms and what they decide.
4. Describe what happens between Priya tapping "Like" and Arjun seeing
   "You have a new match" — every hop, in order.
5. Boot the whole stack on their laptop with one command.
6. Find, in under 60 seconds, the file that owns any feature they're
   asked about.

If all 6 are true, the documentation is done.
