# Miamo Documentation Standard (v3)

**Mission:** Write every doc so a **non-technical person** (parent, designer, new PM) can read it and understand *what the thing is, what it does, how it works*—while a **senior engineer** still gets enough depth to operate it.

This is the style guide. Every new doc must follow it.

---

## The three readers (write for all three)

**Meera (non-tech):** Priya's mom, 55, runs a small business in Chennai. Doesn't know what "Redis" is. But she's smart. She should read your doc and understand what her daughter's app does.

**Priya (the user):** 28, Mumbai, PM, trekker, photographer. The subject of every example. Every doc should illustrate using her experience.

**Arjun-the-engineer:** New backend dev, first day on the team. Needs to know what to deploy, where the code lives, what breaks if he changes something.

---

## Stable analogies (use EXACT phrasings on first mention)

| Tech term | First-mention parenthetical |
|---|---|
| Postgres / database | "the permanent filing cabinet where everything is stored forever" |
| Redis | "a shared whiteboard the services scribble on — fast but wiped if the power goes" |
| Redis Stream | "a never-ending receipt printer — events line up, each consumer tears off what's new" |
| Kubernetes (k8s) | "an automated building manager — it starts, stops, and replaces workers" |
| Docker container | "a shipping container for software — same box runs anywhere" |
| Microservice | "one specialist team that does one job well (auth, chat, photos…)" |
| API / REST endpoint | "a doorbell on a service — you ring it, it answers" |
| Gateway | "the receptionist — every visitor goes through her first" |
| JWT token | "a wristband with an expiry stamp — wear it and you're allowed in" |
| HMAC | "a tamper-proof wax seal — break it and we know" |
| Encryption (AES) | "a locked diary — even we can't read it without the key" |
| Migration | "renovating the filing cabinet — adding new drawers, renaming folders" |
| Schema (Prisma) | "the blueprint for what each drawer in the filing cabinet looks like" |
| Algorithm | "a recipe that scores how well two people match" |
| Tracking event | "a sticky note Priya's phone writes every time she does something" |
| Worker | "a back-room clerk processing the pile of sticky notes" |
| Cache | "a sticky note on the fridge — quicker than opening the cabinet" |
| Feature flag | "a light switch — flip it without re-deploying" |
| Load balancer | "the traffic cop directing visitors to whichever clerk is free" |
| TLS / HTTPS | "the sealed envelope your data travels in" |
| Right-to-be-forgotten (RTBF) | "Priya can ask us to shred her file" |
| CI/CD | "the assembly line that turns a code change into a running service" |

---

## Mandatory structure per doc

Every doc must have:

1. **TL;DR** (one sentence) at the very top.
2. **"How to read this"** box: three paths for Meera, Priya, Arjun-the-engineer.
3. **Story opening** (paragraph or scene with real names and time).
4. **Plain English FIRST**, then code.
5. **Two-column tables** ("In plain English" | "What it really is") when introducing concepts.
6. **Numeric worked examples** for any formula (show actual arithmetic).
7. **"What it means for Priya"** closing section.
8. **"If something breaks"** debug table (symptom → first check → fix).

---

## Real numbers (use these where relevant)

- **11 microservices** with ports: web 3100, gateway 3200, auth 3201, users 3202, social 3203, messaging 3204, content 3205, notifications 3206, ingest 3260, tracking-worker 3261, shared (no port)
- **80+** Prisma models in `services/shared/prisma/schema.prisma`
- **17** ranking algorithms in `services/shared/src/algo/`
- **50** tracking events in 10 families
- **8** Dockerfiles in `docker/`
- **10** Kubernetes templates in `k8s/templates/`
- **7** demo accounts seeded
- **JWT:** HS256, 15min access token, 30day refresh token
- **Password hashing:** bcryptjs cost 12
- **HMAC:** HMAC-SHA256 with `TRACKING_HASH_SECRET` → base64url 22 chars
- **Message encryption:** AES-256-GCM per-message with random IV
- **Score range:** 0..100 integers via `clip100()`
- **forYou weights:** sum to 1.0
- **Fatigue penalty:** `2·ln(1+impressionsLast48h)` subtracted from `forYou` score

---

## Forbidden words (cull on sight)

❌ "blazing fast"  
❌ "seamless"  
❌ "next-gen"  
❌ "world-class"  
❌ "robust"  
❌ "best-in-class"  
❌ "leverages"  
❌ "utilizes" (use "uses" instead)  
❌ "facilitates"  
❌ "enables" (without specifics; "enables Priya to X" is OK)  
❌ "TODO"  
❌ "TBD"  
❌ "coming soon"  
❌ "in progress"  

If something isn't real, don't document it.

---

## Style checklist (before you save)

- [ ] First 5 lines tell a human story, no tech words.
- [ ] Every tech term defined in parenthesis on first use, with the exact analogy from the table above.
- [ ] Priya and Arjun appear in at least one worked example.
- [ ] At least one Mermaid diagram (`flowchart`, `sequenceDiagram`).
- [ ] At least one numbered "what happens when…" walkthrough with timings (e.g., "~40ms").
- [ ] Every formula has worked arithmetic with real numbers (show `a + b = c` not just the formula).
- [ ] Every env var, endpoint, flag, file path was verified to exist (grep, don't guess).
- [ ] Every internal link resolves to a real file in the repo.
- [ ] Zero emojis. Zero forbidden words.
- [ ] No TODO, TBD, "coming soon".
- [ ] Closes with **"What changed and why it's better"** (Before / After / Why Priya feels it).
- [ ] Closes with **"If something breaks"** (3 failure modes, 1-line fixes).
- [ ] A non-tech friend can read it and explain it back to you in their own words.

---

## Per-doc guidelines

### `README.md` (~300 lines)
- Opens with: "Miamo is a dating app. This file tells you, in 2 minutes, what's in this repo and where to read next."
- One mermaid showing 11 services + phone + Postgres/Redis.
- Section: "How a single Like works" with sequence diagram + timings.
- Section: "Local quickstart" — exact bash commands (docker compose up, demo login).
- Section: "Where to read next" — table linking every other doc.

### `MIAMO.md` (~350 lines)
- Treat as the **book**. Non-tech reader reads only this and understands the product.
- Sections: Why Miamo exists → Priya's 9 screens → What makes us different → 17 algorithms (with worked example) → Tracking pipeline → Data safety → Roadmap → What Priya feels.
- Include 2 sequence diagrams (swipe, send message).
- Include 1 worked example for an algorithm with real numbers.

### `docs/ARCHITECTURE.md` (~450 lines)
- One big mermaid: phone → gateway → 8 services → Postgres/Redis.
- Per-box: one sentence on what it owns.
- Section: "Why we split it this way" — 4 reasons in plain English.
- Section: "One request end-to-end" — 3 scenarios (login, swipe, send message) with sequence diagrams.
- Section: "If something breaks" — debug table (6 rows, symptom → fix).

### `docs/ALGORITHMS.md` (~300 lines)
- One table: all 17 algorithms, what they decide, which flag enables them.
- For each algo: (1) what it decides, (2) the weights, (3) worked example with actual numbers, (4) the flag.

### `docs/TRACKING.md` (~250 lines)
- Real timeline: "9:02:14 Priya opens. 9:02:15 sees Arjun. 9:02:31 taps like." — what event fires at each tick?
- Explain HMAC as fingerprint, Redis Stream as conveyor belt.
- Include 15-min rollup with before/after row counts (47 raw → 1 aggregate).
- 50 events listed in 10 families.

### Each `services/*/README.md` (~200 lines)
- Story opening (what happens for Priya when this service works).
- One mermaid diagram (this service in the middle).
- Table: endpoints, what Priya does, what the service returns.
- List of Prisma tables this service owns.
- Real curl examples with actual JSON responses.
- Env vars table with descriptions in plain English.
- "If something breaks" table (3 failure modes).

---

## Worked example template

For any formula or calculation:

```
### 4.2 Example: scoring Arjun against Priya

Input signals:
- Interests overlap: 0.82 / 1.0
- Vibe match: 0.71 / 1.0
- Behaviour: 0.68 / 1.0

Formula:
score = 0.25·interests + 0.20·vibe + 0.20·behaviour

Calculation:
score = 0.25·0.82 + 0.20·0.71 + 0.20·0.68
      = 0.205    + 0.142    + 0.136
      = 0.483

Result: Arjun scores 0.483 (48.3%). That ranks him at position 5 of 10.
```

Show every step. Show the actual numbers. Readers should be able to copy-paste and verify.

---

## Diagrams are mandatory

- `README.md`: 1 mermaid (services + phone)
- Each `docs/*.md`: ≥2 mermaid
- Each service README: 1 mermaid (this service's request flow)

Use `flowchart` (architecture diagrams) or `sequenceDiagram` (request flows). Label arrows in plain English ("ask for matches", "save the like").

---

## Definition of done

A new joiner who reads only `README.md` and `MIAMO.md` should be able to:

1. Explain in their own words what Miamo does.
2. Draw the 11 services + Postgres + Redis on a whiteboard.
3. Name 3 of the 17 algorithms and what they decide.
4. Explain how a click becomes a ranking signal.

If they can't, the docs aren't done.

---

## License

Proprietary.
