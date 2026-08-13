# Miamo — Legal & Compliance Documents

This directory contains the first-cut legal + compliance documents for Miamo's public launch. **None of these documents has been reviewed by qualified counsel yet.** They are drafted by the engineering team and mapped to concrete code paths so that when counsel reviews them, the discussion is about wording and legal risk rather than about what the app actually does.

**Blocker for public launch:** every document below must reach the "Lawyer-reviewed & signed" state.

| # | Document | File | Purpose | Lawyer-review status |
|---|---|---|---|---|
| 1 | Terms of Service | [terms-of-service.md](./terms-of-service.md) | Contract between Miamo and User; eligibility, acceptable use, arbitration | **Not reviewed** — first-cut only |
| 2 | Privacy Policy | [privacy-policy.md](./privacy-policy.md) | What data is collected, why, retention, rights under DPDP | **Not reviewed** — first-cut only |
| 3 | Data Protection Impact Assessment | [dpia.md](./dpia.md) | DPDP §24 risk assessment, mitigations, retention, rights | **Not reviewed** — first-cut only |
| 4 | Patent clearance memo (FTO) | [patent-clearance.md](./patent-clearance.md) | Pre-implementation freedom-to-operate review of v3.6 algorithms | **Not reviewed** — unverified numbers; IP counsel must re-run |

## Status legend

- **Not reviewed** — drafted by engineering; counsel has not looked at it.
- **In review** — counsel has the draft; edits pending.
- **Lawyer-reviewed** — counsel has commented and returned edits; final version drafted.
- **Signed** — final version approved by counsel and countersigned by founder.

## What must happen before public launch

1. Engage qualified Indian counsel familiar with:
   - The Digital Personal Data Protection Act 2023 (DPDP)
   - The Information Technology Act 2000 and rules thereunder
   - The Arbitration and Conciliation Act 1996 (India)
   - Consumer-protection law applicable to online services in India
   - Indian IP law (for the FTO review)
2. Counsel reviews each document and returns marked-up drafts.
3. Engineering incorporates non-material edits; counsel returns for material questions (e.g. arbitration seat, retention windows).
4. Founder countersigns each finalised document.
5. This README is updated to mark each document "Signed".
6. Terms of Service and Privacy Policy are surfaced in-app at the appropriate consent-capture points (signup, first payment).
7. DPIA is filed with the Data Protection Board of India if we cross the Significant Data Fiduciary threshold or on request.

## Point of contact

- Legal correspondence: legal@miamo.in (mailbox to be provisioned).
- Privacy correspondence: privacy@miamo.in.
- IP correspondence: ip@miamo.in.

All addresses to be provisioned at launch.

---

_Last updated: 2026-07-02. Update this file whenever a document's review status changes._
