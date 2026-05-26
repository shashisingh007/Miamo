# Tracking pipeline (v3.1 — Phase 1)

Behavioral analytics for Miamo. Designed for **privacy-first, consent-gated,
lossy-at-the-edge** telemetry that powers ranking, personalization, and product
discovery.

## Architecture

```
 ┌────────────┐    /api/v1/track     ┌──────────┐    XADD events:raw   ┌───────────────┐
 │ web SDK    │ ───────────────────▶ │ gateway  │ ───────────────────▶ │ redis stream  │
 │ (consent)  │   batched envelopes  │ (proxy)  │                       └──────┬────────┘
 └────────────┘                      └──────────┘                              │
                                                                                ▼
                                                              ┌──────────────────────────────┐
                                                              │ rollup workers (Phase 2)     │
                                                              │  → EventAggHourly/Daily      │
                                                              │  → FeatureSnapshot           │
                                                              │  → PairCompatCache           │
                                                              └──────────────────────────────┘
```

## Hard rules

1. **No PII in events.** Paths, referrers, and selectors are scrubbed at the
   edge. No text content, no form values, no keystrokes.
2. **Consent first.** `NEXT_PUBLIC_TRACKING_ENABLED=1` enables the SDK; the
   user must additionally grant the `analytics` scope before any event is
   queued. Pre-consent calls are silently dropped.
3. **Lossy at the edge.** Ring buffer (512) evicts oldest on overflow; ingest
   returns 204 on malformed/blocked input; Redis failures log but never throw.
4. **Right to erasure.** All tables key on `uidHash` (HMAC-SHA256 of `userId`
   with `TRACKING_HASH_SECRET`). Deleting `User` + rotating the secret breaks
   all historical joins back to the identity.
5. **Kill switch.** Set `TRACKING_KILL=1` on the gateway *or* the ingest
   service to short-circuit to 204 immediately.

## Components

| Path | Purpose |
| --- | --- |
| `services/shared/src/track/events.ts` | Event catalog (typed names + envelope) |
| `services/ingest/src/server.ts` | Edge ingest, Zod validate, Redis push |
| `services/web/src/lib/track/index.ts` | Client SDK public API |
| `services/web/src/lib/track/collectors/*` | Route, scroll, cursor, visibility, errors, autotrack |
| `services/web/src/lib/track/react/*` | `TrackProvider`, `useImpression`, `useDwell`, `useTracked`, `useReadingTime` |
| `services/web/src/components/ConsentBanner.tsx` | DPDPA/GDPR-aware opt-in UI |
| `services/shared/prisma/schema.prisma` | `ConsentEvent`, `EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache` |

## Events emitted in Phase 1

Session / lifecycle: `session.start`, `session.heartbeat`, `session.end`, `visibility.change`
Navigation: `page.view`, `page.leave`, `route.change`
Engagement: `impression`, `dwell`, `scroll.depth`, `scroll.idle`, `click`, `click.rage`, `click.dead`, `cursor.sample`
Errors: `error.js`, `error.network`
Feature: any `track('feature_name', {...})` from app code

## Authoring instrumentation

**Declarative (preferred):** add HTML attributes to existing elements.

```tsx
<section data-track-section="hero">…</section>
<button data-track="cta_join" data-track-tt="user" data-track-tid={uid}>Join</button>
<article data-track-impression="card_X" data-track-tid={cardId}>…</article>
```

**Imperative:**

```tsx
import { track } from '@/lib/track';
track('discover.swipe', { dir: 'right', cardId });
```

**Hooks:**

```tsx
import { useImpression, useDwell, useTracked } from '@/lib/track/react/useImpression';
const ref = useImpression('hero');
const onJoin = useTracked('cta_join', { source: 'hero' });
```

## Env reference

| var | where | default |
| --- | --- | --- |
| `NEXT_PUBLIC_TRACKING_ENABLED` | web build | unset (disabled) |
| `NEXT_PUBLIC_TRACK_ENDPOINT` | web build | `/api/v1/track` |
| `TRACKING_KILL` | gateway, ingest | unset |
| `TRACKING_HASH_SECRET` | ingest | dev-only default — set in prod |
| `TRACKING_STREAM_KEY` | ingest | `events:raw` |
| `TRACKING_STREAM_MAXLEN` | ingest | `10_000_000` |
| `REDIS_URL` | ingest | — |
| `INGEST_SERVICE_URL` | gateway | `http://localhost:3260` |

## Phase 2+ (not in this commit)

- Rollup workers (Redis Stream → `EventAggHourly` → `EventAggDaily`).
- Feature aggregator (chronotype, attentionProfile, reply persona, embeddings).
- Pair compat writer (`PairCompatCache`) consumed by the discover ranker.
- Cold-store dump to Parquet for ML training.
- IndexedDB persistence fallback for offline batches.
- Full per-feature instrumentation (discover/messaging/album/DTM/beats).

## Runbook

- **Suspected abuse / DoS:** `kubectl set env deploy/gateway TRACKING_KILL=1` —
  drops every `/api/v1/track*` request to 204 instantly. No restart needed.
- **Schema drift:** the ingest service is schema-agnostic for payloads; only
  envelope shape is enforced. Adding events does not require ingest redeploy.
- **Stream lag:** monitor `XLEN events:raw`. The stream is capped at
  `TRACKING_STREAM_MAXLEN`; older entries are silently trimmed.
