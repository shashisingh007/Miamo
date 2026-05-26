# Access Control (v3.2)

Field-level access lifecycle for sensitive profile data. Replaces the all-or-
nothing visibility model with explicit per-field grants that can be revoked.

## Fields

`photos`, `phone`, `family`, `income`, `kundli`, `lastName`, `exactCity`,
`socials`, `email` (see `ACCESS_FIELDS`).

## Lifecycle

```
pending → approved → (revoked|expired)
pending → denied   → (cooldown 7d before new request)
```

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST   | `/api/v1/access/requests`             | Create / re-open. Idempotent on `(from,to,field)`. |
| GET    | `/api/v1/access/requests/inbox`       | Pending grants the user owes a decision on. |
| GET    | `/api/v1/access/requests/outbox`      | Everything the caller has ever requested. |
| POST   | `/api/v1/access/requests/:id/approve` | Sets `approved` + `expiresAt = +30d`. |
| POST   | `/api/v1/access/requests/:id/deny`    | Sets `denied`. Starts 7-day cooldown. |
| DELETE | `/api/v1/access/requests/:id`         | Withdraw (sender) or revoke (grant owner). |

## Spam controls

- **5** max pending outbound requests per requester (`ACCESS_QUOTA_OUTBOUND`).
- **3** max pending requests per `(field, target)` (`ACCESS_QUOTA_FIELD`).
- **7-day cooldown** after denial on same `(from, to, field)` (`ACCESS_COOLDOWN`).

## Defaults & web surface

- `/access` web page exposes inbox / outbox tabs with approve / deny /
  withdraw / revoke affordances.
- All transitions write an audit log entry (`access_request_*`).

## Deferred

- SSE notifications (`access_request_received`, `access_granted`,
  `access_revoked`) — the persisted `Notification` records will land in a
  follow-up commit, along with the server-side join that hides locked fields
  in profile reads.
