# Miamo — Data Protection Impact Assessment (DPIA)

**First-cut per DPDP Section 24. Not legal advice. Requires privacy-counsel review and (upon commencement of DPDP §24 obligations for Significant Data Fiduciaries) filing with the supervisory authority before public launch.**

This DPIA is the engineering team's structured description of the risks arising from personal-data processing on Miamo, and the mitigations we have implemented. It exists so that counsel can efficiently review and formalise our position — not as a substitute for that review.

**Effective date:** to be set on public launch (revisited every 12 months or on material change).
**Author:** Miamo engineering.
**Reviewer:** privacy counsel (pending).

---

## 1. Data controller

**Miamo** — Indian private limited company (incorporation details TBD). Registered office and primary place of business to be finalised. Data Protection Officer to be appointed prior to public launch per DPDP §10.

## 2. Nature of processing

Miamo is a behavioural-signal dating and social discovery app. The core processing activity is:

- Collecting user-declared profile data (name, age, city, photos, prompt answers, values)
- Collecting behavioural signals (swipes, DTM answers, message send/receive events, view dwell) at the per-request level
- Aggregating those signals into per-user preference vectors and cross-user affinity scores
- Applying the aggregates to rank recommendations shown to the user on Discover, DTM, and the Move suggestion surface
- Retaining raw events for a short window (30 days hot) then rolling into pseudonymised aggregates (90 days cold)

Processing is entirely automated. There is no human review of individual signals unless a moderation report is filed or a user contests an automated decision.

## 3. Categories of data subjects

- Adult users (18+ verified at signup) resident primarily in India
- Age range 18–99 with typical mass 22–35
- Both individual users and (via aggregation) users the individual has interacted with

We do not process data on children. Any account discovered to belong to a minor is terminated per Privacy Policy §10.

## 4. Categories of personal data

| Category | Examples | Sensitivity |
|---|---|---|
| Identity | email, display name, phone (for OTP) | Personal |
| Profile | age, gender, city, occupation, photos, bio | Personal, some sensitive (photos) |
| Behavioural | swipes, DTM answers, message events | Personal, high volume |
| Location | city-level derived from geocoded input | Personal (approximate only) |
| Communications | messages between matched users | Sensitive |
| Payments | transaction amounts and Razorpay order IDs | Financial |
| Device metadata | user-agent, truncated IP, timezone | Personal (technical) |

Sensitive categories (per DPDP §2(u)) explicitly used: none deliberately. Photos may inadvertently disclose religious markers, disability, or health details — these are not extracted into structured fields and are moderated per `docs/architecture/moderation-pipeline.md`.

Caste field: present in the schema but never used in ranking, filtering, or recommendation. This is a deliberate design constraint documented in `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §3.4 (DTM sacred zones).

## 5. Purpose

- **Primary:** match adult users to compatible adult partners for dating and relationships.
- **Secondary:** personalise the DTM topic sequence, the Move suggestion set, and the Discover ordering to each user's revealed preferences.
- **Tertiary:** prevent abuse, moderate content, and comply with legal obligations.

We do NOT sell personal data to third parties, and we do NOT use personal data to train third-party machine-learning models.

## 6. Legal basis

Per DPDP §7 and §8:

- **Contract necessity** — profile, authentication, message delivery
- **Legitimate interest** — behavioural signal aggregation for match ranking, abuse detection
- **Explicit consent** — analytics beyond essential, personalisation-beyond-necessary, marketing, third-party enrichment. Toggles surfaced in Settings → Privacy and audited in a `ConsentEvent` log.
- **Legal obligation** — records mandated by Indian tax and financial law, CERT-In directions, lawful law-enforcement requests

## 7. Risks identified

| # | Risk | Likelihood | Impact | Rating |
|---|---|---|---|---|
| R1 | Re-identification of pseudonymised behavioural aggregates | Low (HMAC + salt) | High (privacy) | Medium |
| R2 | Algorithmic discrimination (age, gender, caste, religion, region) | Medium (structural bias in swipe data) | High (fairness) | High |
| R3 | Minor accessing the Service by lying about age | Medium | Very High (safeguarding) | High |
| R4 | Data breach exposing profile + messages | Low (encrypted at rest + TLS in transit) | Very High (personal) | High |
| R5 | Off-platform harassment continuing after block | Medium | High | High |
| R6 | Third-party subprocessor breach (Razorpay, AWS, Sentry) | Low | High | Medium |
| R7 | Excessive data retention past user expectation | Low (30/90-day windows enforced) | Medium | Low |
| R8 | Inference from behavioural signals leaking sensitive attributes (sexuality, health) | Medium | High | High |
| R9 | CSAM upload | Very Low (18+ gate + moderation) | Extreme (criminal) | High |
| R10 | Location leak enabling stalking (raw geolocation) | Very Low (city-level only, never raw) | Very High | Low |
| R11 | Consent-scope creep — using data for purposes users did not agree to | Low (audit-logged toggles) | High | Medium |

## 8. Mitigation measures

**Cryptographic + architectural**
- Passwords: Argon2id
- Behavioural pseudonymisation: HMAC-SHA256 per-deployment secret (`services/shared/src/track/hash.ts`) — addresses R1
- Message encryption: AES-256-GCM at rest, key derived via scrypt from a per-deployment secret — addresses R4
- Payment isolation: no card data in Miamo systems (Razorpay tokenisation) — addresses R6

**Policy + process**
- Age gate at signup + phone OTP secondary verification — addresses R3
- Photo moderation pipeline (`docs/architecture/moderation-pipeline.md`) — addresses R9 primarily and R3, R8 secondarily
- Text moderation pipeline (same doc) — addresses R5, R8
- Bidirectional block invisibility — addresses R5
- No caste in ranking or filtering (structural constraint) — partially addresses R2
- Fairness Gini monitoring on Discover ranker (`services/tracking-worker/src/fairnessAudit.ts`) — addresses R2

**Data-lifecycle**
- 30-day hot / 90-day cold retention windows (`services/tracking-worker/src/cold-store.ts`) — addresses R7
- Right-to-be-forgotten across 14 tables (`services/tracking-worker/src/forget.ts`) — addresses R7 and honours DPDP §12
- Data export (JSON zip) — honours DPDP §11

**Consent + transparency**
- Four consent toggles with `ConsentEvent` audit table — addresses R11
- Trust Score UI and "Why am I seeing this?" card — honours DPDP §12 algorithmic transparency
- Human-review appeal path within 72 hours — honours DPDP §12 automated-decision safeguard

**Monitoring**
- Sentry with PII scrubber (`services/shared/src/service.ts`) — addresses R4 downstream
- CERT-In-compliant breach playbook (target: 6-hour report window) — addresses R4
- Quarterly access-review of subprocessor DPAs — addresses R6

## 9. Retention policy

| Data class | Hot retention | Cold retention | RTBF window |
|---|---|---|---|
| Raw event stream | 30 days | not retained | included in per-user erasure |
| Behavioural aggregates | n/a | 90 days (HMAC-keyed) | included |
| Profile + photos | for account lifetime | n/a | purged within 30 days of erasure request |
| Messages | for account lifetime, encrypted | n/a | purged within 30 days of erasure request |
| Payment records | for 7 years (statutory tax retention) | n/a | pseudonymised on erasure — records retained per statute in aggregated form only |
| Audit logs | 1 year hot | 6 years cold | anonymised on erasure |

## 10. Data subject rights implementation

| Right | DPDP § | Implementation |
|---|---|---|
| Access | §11 | Settings → Export My Data → JSON zip (30 days) |
| Correction | §12 | Settings → Profile (self-serve) or email privacy@miamo.app |
| Erasure | §12 | Settings → Delete Account → 14-table purge within 30 days |
| Portability | §11 | Same as Access — JSON zip |
| Objection | §12 | Settings → Privacy — four consent toggles, all can be withdrawn |
| Human review | §12 | Any automated decision appealable within 30 days; 72-hour SLA |
| Complaint to supervisory authority | §13 | Grievance officer + right to escalate to the Data Protection Board of India |

## 11. Consultation

- **Data subjects:** we intend to consult a small pilot cohort (~50 launch users) via a structured privacy walkthrough before public launch. Findings will be recorded here in §11.1.
- **DPO:** to be appointed; will review this DPIA before it is finalised.
- **Privacy counsel:** review pending (blocker for public launch).
- **Supervisory authority:** we intend to notify the Data Protection Board of India in accordance with §24 once appointed and, where applicable, once we cross the Significant Data Fiduciary threshold.

### 11.1 Data-subject consultation findings

_To be populated after the pre-launch pilot review._

## 12. Sign-off

- [ ] Engineering — this document
- [ ] Product — retention policy + consent scopes
- [ ] Legal — DPDP compliance review
- [ ] DPO — final review + sign
- [ ] Founder — accountable owner

Once all six checkboxes are signed, we cut the effective date and file per statute.

---

_Contact for this DPIA: privacy@miamo.app._
