# 🔒 Security Practices

LogMetric implements enterprise-grade security measures to ensure strict tenant isolation and data protection.

- **Two independent auth mechanisms**, both enforced in one Spring Security filter chain: JWT (HS384, ≥32-byte secret required at startup) for the dashboard, hashed API keys for ingestion.
- **Every read is org-scoped server-side.** `AuthUtils` resolves the caller's `organizationId` (and, for API keys, `systemId`) from the authenticated principal — never from a request parameter — and every controller, service query, and SSE subscription is required to use it.
- **RBAC via `hasAuthority`, not `hasRole`** — `User.getAuthorities()` returns bare `ADMIN`/`USER` with no `ROLE_` prefix, so `hasRole(...)` would silently never match.
- **OTP hygiene.** Signup and password-reset codes are 6-digit, `SecureRandom`-generated, BCrypt-hashed, single-use, capped at 5 attempts, and rate-limited by a 60s resend cooldown. Every enumeration-sensitive endpoint (`resend-verification`, `forgot-password`) returns an identical response regardless of whether the address exists.
- **Clean 401/403 bodies** from a dedicated `AuthenticationEntryPoint`/`AccessDeniedHandler` pair, including for malformed or tampered JWTs (caught explicitly, not left to crash as a 500).
- **Cross-org lookups 404, not 403** — a user/invite/system/rule ID from another org reads as "not found," not "forbidden," so an attacker can't use the response to confirm an ID exists elsewhere.
- **Recipient validation on alert rules.** A rule's email recipients must belong to a real member of the caller's own org, rejected by name otherwise — closing what would be an open relay for exfiltrating alert content (which can include log excerpts).
- **Audit trail.** Every login and admin mutation is recorded org-scoped, so "who generated this key" or "who changed this role" has an answer.
- **Automated tenant-isolation and RBAC regression tests** run as part of `./mvnw verify`.
