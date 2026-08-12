# 🔌 API Reference

All endpoints are under `/api`. JWT endpoints expect `Authorization: Bearer <token>`; ingestion uses `X-API-KEY: <key>` instead.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | none | Create an org + admin user; issues an email verification code |
| POST | `/auth/register-with-invite` | none | Join an org via invite code as `USER`; same verification |
| POST | `/auth/verify-email` | none | Confirm the 6-digit signup code; returns a JWT |
| POST | `/auth/resend-verification` | none | New code, subject to a 60s cooldown |
| POST | `/auth/login` | none | Returns a JWT (403 if the account isn't verified yet) |
| POST | `/auth/forgot-password` | none | Always 200; issues a reset code if the address is registered |
| POST | `/auth/reset-password` | none | Resets the password with a valid code |
| POST | `/auth/change-password` | JWT | Change your own password (requires the current one) |
| GET | `/auth/me` | JWT | Current user's fresh role/org (not the JWT's stale claim) |
| PATCH | `/organizations` | JWT, `ADMIN` | Rename the caller's own organization |
| POST | `/logs` | API key | Ingest one log event (202 Accepted) |
| POST | `/logs/search` | JWT | Org-scoped search + aggregations |
| GET | `/logs/stream` | JWT | Org-scoped SSE live tail |
| POST | `/systems` | JWT, `ADMIN` | Create a system |
| GET | `/systems` | JWT | List the org's systems |
| DELETE | `/systems/{id}` | JWT, `ADMIN` | Delete a system |
| POST | `/systems/{id}/keys` | JWT, `ADMIN` | Generate an API key for a system (shown once) |
| GET | `/keys` | JWT, `ADMIN` | List key metadata (masked hint, system, revoked) |
| GET | `/alert-rules` | JWT, `ADMIN` | List the org's alert rules |
| POST | `/alert-rules` | JWT, `ADMIN` | Create a rule |
| PUT | `/alert-rules/{id}` | JWT, `ADMIN` | Replace a rule |
| DELETE | `/alert-rules/{id}` | JWT, `ADMIN` | Delete a rule |
| GET | `/alerts/stream` | JWT | Org-scoped SSE feed of triggered alerts |
| POST | `/invites` | JWT, `ADMIN` | Generate a 7-day single-use invite code |
| GET | `/invites` | JWT, `ADMIN` | List outstanding invites |
| DELETE | `/invites/{id}` | JWT, `ADMIN` | Revoke an unredeemed invite |
| GET | `/users` | JWT, `ADMIN` | List the caller's org members |
| PATCH | `/users/{id}/role` | JWT, `ADMIN` | Promote or demote a teammate |
| GET | `/service-aliases` | JWT | List the org's service display aliases |
| PUT | `/service-aliases` | JWT, `ADMIN` | Set or replace a service's display alias |
| DELETE | `/service-aliases` | JWT, `ADMIN` | Clear a service's display alias |
| GET | `/audit-logs` | JWT, `ADMIN` | Paginated, org-scoped audit history |
| DELETE | `/audit-logs` | JWT, `ADMIN` | Purge audit entries older than `olderThanDays` |
| POST | `/deployments` | JWT, `ADMIN` | Record a new system deployment marker |
| GET | `/deployments` | JWT | List deployments matching a date range |
| GET | `/deployments/{id}/new-patterns` | JWT | List new log patterns seen since a specific deployment |
| GET | `/patterns` | JWT | List org-scoped log patterns (clusters) sorted by volume/new/recent; paginated |
| GET | `/analytics/compression` | JWT | Get org-scoped compression statistics: total events, distinct templates, events-per-template, projected savings, top 5 patterns by volume |

### Example: Ingest a log

```bash
curl -X POST http://localhost:8081/api/logs \
  -H "X-API-KEY: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"level":"ERROR","serviceName":"auth-service","message":"Failed login for user 4983 from 192.168.1.1"}'
```

The message above and one for user `9021` from a different IP both hash to the same `patternHash` — the numbers are template variables, not part of the pattern's identity.
