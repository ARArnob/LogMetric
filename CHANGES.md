# Changelog

High-level, human-readable history of LogMetric. For the full task-by-task rationale and
acceptance criteria, see the project's internal planning docs; this file is the public-facing
summary kept current per change, per the project's own convention.

## Account & organization self-service
- **Service display aliases** — org-scoped, admin-editable labels for the free-text `serviceName`
  carried on every log line, resolved client-side everywhere a service name is rendered (Explorer,
  the log detail drawer, Dashboard's top-services, Pattern Clusters, and the live tail). Read-only
  for non-admins. Non-destructive: clearing an alias reverts to the raw name instantly.
- **Organization rename** (`PATCH /api/organizations`, admin-only) and **change password while
  logged in** (`POST /api/auth/change-password`) — both reuse the existing validation rules
  (unique-name check, 8-character minimum) rather than introducing new ones.
- **Invite lifecycle** — `GET /api/invites` and `DELETE /api/invites/{id}` let an admin see every
  outstanding invite for their org and revoke one before it's redeemed, closing the gap where a
  leaked invite code was a live credential for up to 7 days with no way to kill it early.

## Account security: OTP-based email verification & password reset
- **Email verification at signup.** Both signup paths (new org, invite redemption) now issue a
  6-digit code by real email (`spring-boot-starter-mail`, MailHog in dev) instead of returning a
  usable session immediately. Login is blocked with a specific 403 until the address is verified.
  Codes are BCrypt-hashed, single-use, expire in 10 minutes, cap at 5 attempts, and are subject to
  a 60-second resend cooldown — the resend endpoint returns an identical response whether or not
  the address has a pending signup, so it can't be used to enumerate accounts.
- **Forgot / reset password**, built on the same OTP infrastructure with a `PASSWORD_RESET`
  purpose that is structurally invisible to the email-verification lookup and vice versa.
  `forgot-password` always returns the same generic response regardless of whether the address is
  registered. A successful reset also marks the account's email as verified, since proving inbox
  control is exactly the same proof either flow requires.
- **Known, intentional limitation:** JWTs are stateless with no server-side revocation, so a
  session issued before a password change or reset remains valid until it naturally expires.

## Real alerting
- **`AlertRule`** — an org-scoped, admin-managed rule (`ERROR_RATE`, `VOLUME_ZSCORE`, or `ENTROPY`,
  each with its own threshold, evaluation window, and a `targetEmails` distribution list validated
  against real org members) replaces the previous console-only, unscoped anomaly sweep.
- **Rule-driven evaluation** runs every 60 seconds per enabled rule, scoped to that rule's own
  organization and window, reusing the existing EMA z-score / Shannon entropy math (now
  parameterized by the rule's threshold rather than a single hardcoded constant, and re-keyed by
  `orgId:serviceName` so one tenant's traffic can't skew another's baseline).
- **Delivery** — a triggered rule sends exactly one email (every recipient in a single `To`
  header) and one event on an org-scoped `alerts` Server-Sent Events channel, gated by a
  configurable cooldown (900s default) so a sustained incident produces one notification, not one
  per tick.
- **Frontend** — a real rule editor on `/alerts` (create/edit/delete, enable/disable, a recipient
  multi-select sourced from the org's actual member list) plus a live feed wired to the real SSE
  channel, replacing the honest placeholder that previously explained the feature wasn't live yet.

## System entity & true tenant hierarchy
- Introduced `SystemEntity` as a first-class child of `Organization`: every API key now belongs to
  a `System`, and `systemId` is derived server-side from the authenticating key on every log
  ingested — a client-supplied `systemId` in the request body is silently overwritten with the
  key's real one, closing the one remaining tenant-boundary gap that predated this change.
- `POST/GET /api/systems`, `DELETE /api/systems/{id}`, and `POST /api/systems/{id}/keys` (which
  replaces the old, org-level `POST /api/keys/generate`) round out System CRUD, gated the same way
  every other org-scoped resource in this codebase is (creation admin-only, cross-org IDs 404 not
  403). A "Default System" is auto-created for every new organization so existing key-generation
  UX keeps working with no picker UI yet.

## Multi-tenant isolation, RBAC, and onboarding hardening
- Closed two active cross-tenant data leaks: the SSE broadcast fanned every log out to every
  connected client regardless of organization, and `GET /api/logs` had no organization filter at
  all (removed outright — `POST /api/logs/search` already covered its use case correctly).
- Centralized organization resolution (`AuthUtils`) so every controller derives the caller's
  `organizationId` from the authenticated principal, never from a request parameter or a
  hardcoded fallback.
- Closed an org-join-by-name hole (registering with an existing organization's name silently
  granted access to it) and replaced it with invite-token-based onboarding: an admin generates a
  single-use, 7-day-expiring code; a teammate redeems it to join as `USER`.
- Full RBAC: `ADMIN`/`USER` roles enforced via `@PreAuthorize("hasAuthority(...))`, re-checked
  fresh from the database on every request rather than decoded from the JWT, so a promotion or
  demotion takes effect on the user's very next request with no re-login required.
- Fixed the JWT secret's encoding contract (raw UTF-8 bytes, ≥32-byte fail-fast check at startup)
  and hardened `JwtAuthFilter` to treat a malformed or tampered token as unauthenticated (401)
  instead of crashing with a raw 500.
- Automated regression coverage: a tenant-isolation test (two orgs, two API keys, asserting one
  can never read the other's data via search, the removed `GET` endpoint, or SSE) and an RBAC test
  (every admin-gated endpoint 403s a `USER` JWT and an API-key principal, 200s an `ADMIN`) both run
  as part of `./mvnw verify`.

## Search, pattern clustering, and the frontend rebuild
- Search results are sorted newest-first (previously unspecified, so results came back in
  arbitrary index order); ingested logs with no client-supplied timestamp are now stamped
  server-side instead of silently breaking the date-histogram aggregation.
- Added `serviceNames` and `patternClusters` aggregations (the latter with per-cluster severity
  and per-service breakdowns), plus a `patternHash` filter so a specific cluster's member logs can
  actually be fetched, not just counted.
- A ground-up Next.js frontend: real auth and routing, a Log Explorer with server-side search and
  a detail drawer, a Pattern Clusters page, Team management (invites, role changes), Settings
  (API key generation), a command palette, brushable time-range histograms, three complete themes
  with a validated colour-vision-deficiency-checked status palette, full keyboard/screen-reader
  accessibility, responsive layout from 375px to 1920px, virtualized tables above 200 rows, and
  automatic SSE reconnect with backoff after a dropped connection.

## Foundational rewrite (from the original API-key prototype)
- Replaced the original interceptor-based, single-tenant API key check with a proper dual Spring
  Security filter chain: a stateless, `X-Api-Key`-authenticated chain for `POST /api/logs`, and a
  JWT-authenticated chain (`Authorization: Bearer <token>`) for everything else.
- Introduced `Organization`, `User`, and `Role` as real entities (the original prototype had only
  a bare `ApiKey` tied to a hardcoded organization id), an async RabbitMQ → Elasticsearch ingestion
  pipeline, and `PatternRecognitionService`'s SHA-256 structural-template hashing for pattern
  clustering — the project's core differentiator.
