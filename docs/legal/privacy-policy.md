# Miamo — Privacy Policy

**First-cut. Not legal advice. Requires DPIA + qualified Indian counsel review before public launch.** This document is a starting point drafted by the engineering team and mapped to concrete code paths. It must be reviewed by a privacy lawyer familiar with India's Digital Personal Data Protection Act 2023 (DPDP) and the Information Technology (Reasonable Security Practices) Rules 2011 before we go public. Where this document describes a control, it references the code path that implements it — verifiable, not vapour.

**Effective date:** to be set on public launch.
**Data controller:** Miamo (Indian private limited company, incorporation details to be finalised).
**Data protection officer:** to be appointed and named here (DPDP §10 obligation).
**Contact:** privacy@miamo.in.

---

## 1. Scope

This policy explains what personal data Miamo ("we", "us", "our") collects when you use our app or website (the "Service"), how we use it, who we share it with, how long we keep it, and what rights you have.

It applies to all Users of the Service. If you are a data subject in India, this policy is drafted to comply with the Digital Personal Data Protection Act 2023 (DPDP). Where a right is available to you under the DPDP, we implement it and note the section here.

## 2. What we collect

We collect only what we need to run the Service. See `docs/DATA_MODEL.md` for the exhaustive schema.

### 2.1 Account and profile

- Email address (required)
- Password (stored as an Argon2 hash — plaintext is never persisted)
- Display name, username, age (18+ required), gender, city, occupation
- Optional profile fields: bio, prompt answers, height, education, work-values responses
- Photos you upload (stored as URLs; the images themselves live in object storage — currently S3 in launch region ap-south-1)

### 2.2 Behavioural signals

We record how you use the Service to improve match ranking:

- Swipes (right / left / super) and their timing
- DTM ("Deeper Than a Match") answers you give
- Messages you send and receive (encrypted at rest, see §5)
- Content you post and engage with (reactions, comments, views)
- Session cadence — when you open the app, how long you use it, what you do

### 2.3 Device and connection metadata

- IP address (truncated after 24 hours per §4)
- User-agent string
- Approximate location (city-level; derived from geocoding via Nominatim — never the raw browser geolocation unless you explicitly opt in)
- Timezone

### 2.4 Payments

If you purchase Spotlight minutes or a premium tier, we collect:
- The transaction record from Razorpay (order ID, amount, timestamp)
- We DO NOT store card numbers, CVVs, or bank credentials — these live only with Razorpay.

## 3. Why we collect it — legal basis

Per DPDP §7 and §8, our legal basis for processing is:

- **Contract necessity** — data required to provide the Service (email, password, profile essentials, messages).
- **Legitimate interest** — behavioural signals used for match ranking and abuse prevention.
- **Explicit consent** — separately toggled categories (analytics, personalisation-beyond-necessary, marketing) accessible in Settings.
- **Legal obligation** — records we must keep to comply with Indian tax, financial, or law-enforcement requirements.

## 4. Retention and cold-store policy

We aggressively minimise how long data lives in identified form.

- **Raw event stream** — 30 days in the hot store, then dropped.
- **Cold-store aggregates** — 90 days, pseudonymised. Every user-scoped record in the cold store is keyed by an HMAC-SHA256 hash of the user ID (see §5) rather than the raw ID. Reference: `services/tracking-worker/src/cold-store.ts`.
- **Backups** — 90-day rolling PITR window on Postgres. Backups older than 90 days are purged.
- **Legal hold** — records under lawful preservation (subpoena, court order) are exempted from routine deletion until the hold is lifted.

## 5. Pseudonymisation and encryption

- **User IDs in behavioural analytics** are HMAC-SHA256 hashed with a per-deployment secret. The mapping is one-way; ranking models see hashes, not raw IDs. Reference: `services/shared/src/track/hash.ts`.
- **Messages** are encrypted at rest with AES-256-GCM. The encryption key is derived via scrypt from a per-deployment secret. Reference: `services/messaging/src/server.ts` (ENC_KEY block).
- **In transit** everything moves over TLS 1.2+.
- **Passwords** are hashed with Argon2id (memory-hard, side-channel resistant).

## 6. Your rights under DPDP

You can exercise these rights from **Settings → Privacy** in-app, or by writing to privacy@miamo.in.

### 6.1 Right of access (DPDP §11)
You can request a copy of the personal data we hold about you. Use **Settings → Export My Data**; you receive a signed JSON archive within 30 days. This feature is live today.

### 6.2 Right to correction (DPDP §12)
You can edit your profile data at any time from **Settings → Profile**. For fields you cannot edit yourself (e.g. account age, verified email), write to privacy@miamo.in.

### 6.3 Right to erasure (DPDP §12)
You can delete your account from **Settings → Delete Account**. On confirmation, we purge you from 14 primary tables and every associated cold-store aggregate within 30 days. Reference: `services/tracking-worker/src/forget.ts` (right-to-be-forgotten implementation).

### 6.4 Right to portability (DPDP §11)
The export archive from §6.1 is a machine-readable JSON zip.

### 6.5 Right to object (DPDP §12)
You can withdraw consent for optional processing at any time via **Settings → Privacy**. Four toggles: analytics, personalisation-beyond-necessary, marketing, third-party enrichment. Withdrawing consent for essential categories terminates the Service.

### 6.6 Right to algorithmic transparency (DPDP §12)
You have the right to understand automated decision-making that materially affects you. In-app we surface:
- The **Trust Score UI** on your profile — what your Trust Score is and what drives it.
- The **"Why am I seeing this?" card** on Discover — for each candidate, the reason our ranker surfaced them.

Reference: `services/web/src/app/(main)/discover/**` and profile Trust Score components.

### 6.7 Right to human review
Any automated decision that suspends or terminates your account can be appealed within 30 days to appeals@miamo.in. A human reviews within 72 hours.

## 7. Consent management

You have four consent toggles in **Settings → Privacy**. Each defaults to OFF except where required to operate the Service:

1. **Strictly necessary** — always on (required to run the Service). Includes essential cookies, session storage.
2. **Analytics** — off by default. When on, we record aggregate usage patterns for product improvement.
3. **Personalisation** — off by default. When on, we tune Discover ranking to your revealed preferences beyond the essential ranking.
4. **Marketing** — off by default. When on, we can send promotional email and push notifications.

Every consent event is written to a `ConsentEvent` audit table with `userId`, `category`, `granted`, `timestamp` — so we can prove consent state at any historical point.

Cookies: strictly-necessary only. We do not use third-party advertising or tracking cookies.

## 8. Third-party subprocessors

We share only what is needed for each subprocessor to perform its function:

| Subprocessor | Data shared | Purpose |
|---|---|---|
| Amazon Web Services (S3 ap-south-1, RDS ap-south-1) | Profile data, photos, messages (encrypted) | Storage and compute |
| Razorpay | Transaction details (amount, currency, order ID) | Payment processing |
| Nominatim (OpenStreetMap) | Only the city string you enter | Geocoding |
| Sentry | Error events with PII redacted (see §11) | Error monitoring |
| Resend (planned, launch) | Email address, transactional email content | Transactional email |
| MSG91 / Twilio (planned, launch) | Phone number, OTP code | SMS OTP |

We do NOT share data with advertising networks, data brokers, or unaffiliated third parties for marketing purposes.

## 9. International transfers

Primary storage is in AWS ap-south-1 (Mumbai). We do not transfer identifiable personal data outside India except (a) transactional emails sent via Resend (US) — an accepted subprocessor under DPDP with a signed DPA — and (b) error metadata sent to Sentry after PII scrubbing.

## 10. Age of user

The Service is for adults 18+. If we discover a user is under 18, we immediately suspend the account, delete their data within 7 days, and refund any purchased balance. Reference: age-gate on signup + phone-verification workflow.

## 11. PII scrubbing in monitoring

Every event that leaves the app for Sentry passes through a scrubber that redacts:
- Passwords (any field named `password*`)
- Session cookies, authorisation headers, internal API keys
- Query-string tokens
- Emails are hashed rather than sent raw

Reference: `services/shared/src/service.ts` `_sentryScrubBody` + `_sentryScrubQueryString` + `_sentryHashEmail`.

## 12. Data breach notification

In the event of a data breach affecting personal data, we will:
- Notify the Data Protection Board of India within 72 hours (DPDP §8(6))
- Notify affected users without undue delay if the breach is likely to result in significant harm
- Notify CERT-In (Indian Computer Emergency Response Team) per the CERT-In Directions (April 2022) — within 6 hours for a "reportable cyber incident"

We maintain a breach playbook in `docs/RUNBOOK.md` Appendix K (to be added if not yet present).

## 13. Children's data

We do not knowingly collect data from children under 18. If we learn a child has provided personal data, we delete it and terminate the account (see §10).

## 14. Security

- TLS 1.2+ in transit
- AES-256-GCM at rest for messages
- Argon2id for password hashes
- HMAC-SHA256 for behavioural analytics pseudonyms
- Rate-limiting, idempotency, and abuse detection at every write endpoint
- Quarterly security audits (external once at scale)
- Bug-bounty program (planned, post-launch)

## 15. Changes to this policy

Material changes are announced by email + in-app 30 days before they take effect. The revision history is kept in the Git history of this repository — the current effective version is always on `main`.

## 16. Contact and grievance officer

- **Privacy team:** privacy@miamo.in
- **Grievance officer (DPDP §13):** to be appointed and named here. All grievances acknowledged within 48 hours and resolved within 30 days.

---

_Contact: privacy@miamo.in · Postal: to be finalised on incorporation._
