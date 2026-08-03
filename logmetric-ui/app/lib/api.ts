import { backendUnreachableStore } from "./backendHealth";
import { signalSessionExpired } from "./sessionExpiry";

// ===== Types =====

export interface LogEntry {
  id: string;
  timestamp: string; // ISO-8601 -- backend serializes Instant this way
  level: string;
  serviceName: string;
  systemId?: string | null;
  message: string;
  userId?: string;
  patternHash?: string;
  organizationId?: string;
}

export interface LogSearchRequest {
  keyword?: string;
  levels?: string[];
  serviceNames?: string[];
  startDate?: number;
  endDate?: number;
  page?: number;
  size?: number;
  systemId?: string;
  patternHash?: string;
}

export interface HistogramBucket {
  timestamp: number;
  count: number;
  levels: Record<string, number>;
}

export interface SeverityBucket {
  level: string;
  count: number;
}

export interface ServiceBucket {
  name: string;
  count: number;
}

export interface PatternCluster {
  patternHash: string;
  count: number;
  levels: Record<string, number>;
  sampleMessage?: string;
  sampleService?: string;
  serviceCount?: number;
  dominantService?: string;
}

export interface LogSearchResponse {
  logs: LogEntry[];
  total: number;
  histogram: HistogramBucket[];
  severityDistribution: SeverityBucket[];
  serviceNames: ServiceBucket[];
  patternClusters: PatternCluster[];
  /** "minute" | "hour" | "day" | "week" -- the calendar interval the backend actually bucketed by, so the chart's axis label can never contradict the data (F13). */
  histogramInterval: string;
}

// The backend returns aggregation buckets as Map<String,Object>, so numbers
// and missing fields aren't guaranteed to arrive as the types above imply.
// Coerce once here, at the boundary, so every consumer downstream can trust
// the real interfaces instead of re-guarding at every call site.
function normalizeSearchResponse(raw: unknown): LogSearchResponse {
  const r = (raw ?? {}) as Record<string, unknown>;
  const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  return {
    logs: asArray(r.logs) as LogEntry[],
    total: Number(r.total ?? 0),
    histogram: asArray(r.histogram).map((b) => {
      const bucket = (b ?? {}) as Record<string, unknown>;
      const levels = (bucket.levels ?? {}) as Record<string, unknown>;
      return {
        timestamp: Number(bucket.timestamp ?? 0),
        count: Number(bucket.count ?? 0),
        levels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, Number(v)])),
      };
    }),
    severityDistribution: asArray(r.severityDistribution).map((b) => {
      const bucket = (b ?? {}) as Record<string, unknown>;
      return { level: String(bucket.level ?? ""), count: Number(bucket.count ?? 0) };
    }),
    serviceNames: asArray(r.serviceNames).map((b) => {
      const bucket = (b ?? {}) as Record<string, unknown>;
      return { name: String(bucket.name ?? ""), count: Number(bucket.count ?? 0) };
    }),
    patternClusters: asArray(r.patternClusters).map((b) => {
      const bucket = (b ?? {}) as Record<string, unknown>;
      const levels = (bucket.levels ?? {}) as Record<string, unknown>;
      return {
        patternHash: String(bucket.patternHash ?? ""),
        count: Number(bucket.count ?? 0),
        levels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, Number(v)])),
        sampleMessage: bucket.sampleMessage != null ? String(bucket.sampleMessage) : undefined,
        sampleService: bucket.sampleService != null ? String(bucket.sampleService) : undefined,
        serviceCount: bucket.serviceCount != null ? Number(bucket.serviceCount) : undefined,
        dominantService: bucket.dominantService != null ? String(bucket.dominantService) : undefined,
      };
    }),
    histogramInterval: typeof r.histogramInterval === "string" ? r.histogramInterval : "hour",
  };
}

export interface TeamUser {
  id: number;
  email: string;
  role: string;
}

export interface Invite {
  code: string;
  expiresAt: string; // ISO-8601 instant
}

export interface AuthUser {
  email: string;
  role: string;
  organizationId: number;
  /** Only populated after a getCurrentUser() refresh (via /auth/me) -- absent for the brief window right after login/signup, until the auth context's background refresh fills it in. */
  organizationName?: string;
}

interface StoredAuth {
  token: string;
  user: AuthUser;
}

interface AuthApiResponse {
  token: string;
  email: string;
  role: string;
  organizationId: number;
}

/** register()/registerWithInvite() no longer hand back a token directly -- both now require confirming an emailed code first (verifyEmail). */
export interface VerificationPendingResponse {
  email: string;
  message: string;
}

// ===== Config =====

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";

/**
 * Public marketing/demo view: fabricated data, no backend or login
 * required. Gated behind an explicit flag so a real deployment never
 * silently disguises a broken backend as working data.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * Every real request funnels through this instead of calling fetch()
 * directly, so backend-reachability detection (F17) lives in exactly one
 * place. fetch() rejects with a TypeError for a genuine network failure
 * (DNS/connection refused) -- that's the "backend is down" signal. A
 * cancelled/timed-out request (AbortError) is not a reachability problem
 * and must not trip the banner. Getting any HTTP response at all, even a
 * 4xx/5xx, proves the server is reachable and clears it.
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    backendUnreachableStore.set(false);
    return response;
  } catch (err) {
    if (err instanceof TypeError) {
      backendUnreachableStore.set(true);
    }
    throw err;
  }
}

// ===== Auth storage =====
// Single source of truth for the JWT + user, shared between plain API
// calls here and the React context in app/lib/auth.tsx.

const AUTH_STORAGE_KEY = "logmetric_auth";

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ??
      sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

/** persistent=true survives browser restarts (localStorage); false clears on tab close (sessionStorage). */
export function setStoredAuth(auth: StoredAuth, persistent = true): void {
  const primary = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  primary.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  other.removeItem(AUTH_STORAGE_KEY);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Rewrites just the user portion of stored auth, preserving the token and whichever storage (local/session) is already in use. */
export function updateStoredUser(user: AuthUser): void {
  const stored = getStoredAuth();
  if (!stored) return;
  const persistent = localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  setStoredAuth({ token: stored.token, user }, persistent);
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}

// ===== Error handling =====

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Thrown for MethodArgumentNotValidException responses -- GlobalExceptionHandler
 * returns a field->message map instead of a single top-level `message`, so
 * these need to be routed to the right input, not dumped as one string.
 */
export class ValidationError extends ApiError {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(400, "Validation failed");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body && typeof body === "object" && "fields" in body && body.fields && typeof body.fields === "object") {
      throw new ValidationError(body.fields as Record<string, string>);
    }
    const message =
      (body && typeof body === "object" && "message" in body && (body as { message?: string }).message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, String(message));
  }
  return (await response.json()) as T;
}

// ===== Auth API =====

export async function login(email: string, password: string): Promise<AuthApiResponse> {
  const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse<AuthApiResponse>(response);
}

export async function register(
  email: string,
  password: string,
  organizationName: string
): Promise<VerificationPendingResponse> {
  const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, organizationName }),
  });
  return parseJsonResponse<VerificationPendingResponse>(response);
}

/** Joins an existing organization as a USER by redeeming a single-use invite code. */
export async function registerWithInvite(
  email: string,
  password: string,
  inviteCode: string
): Promise<VerificationPendingResponse> {
  const response = await apiFetch(`${API_BASE_URL}/auth/register-with-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, inviteCode }),
  });
  return parseJsonResponse<VerificationPendingResponse>(response);
}

/** Confirms the signup OTP and returns the same token/response shape register() used to return directly, before email verification gated login. */
export async function verifyEmail(email: string, code: string): Promise<AuthApiResponse> {
  const response = await apiFetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return parseJsonResponse<AuthApiResponse>(response);
}

/** Always resolves with the same generic message whether or not the address has a pending signup -- the backend deliberately doesn't leak that distinction. */
export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse<{ message: string }>(response);
}

/** Always resolves with the same generic message whether or not the address is registered -- stricter than resendVerification since the caller hasn't proven anything here. */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse<{ message: string }>(response);
}

/** Confirms the reset code, sets the new password, and logs the user in -- also marks the account emailVerified, since proving inbox control satisfies that too. */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<AuthApiResponse> {
  const response = await apiFetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return parseJsonResponse<AuthApiResponse>(response);
}

/** Requires the current password; the caller's existing JWT stays valid until it expires either way -- there's no server-side session revocation. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<{ message: string }>(response);
}

/** ADMIN only. Rejects a name already claimed by a different organization. */
export async function updateOrganizationName(name: string): Promise<{ id: number; name: string }> {
  const response = await apiFetch(`${API_BASE_URL}/organizations`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<{ id: number; name: string }>(response);
}

/** The caller's own record, read fresh from the DB -- used to detect a role change without waiting for re-login. */
export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiFetch(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<AuthUser>(response);
}

// ===== Log search (authenticated) =====

export async function searchLogs(
  request: LogSearchRequest = {},
  opts: { signal?: AbortSignal } = {}
): Promise<LogSearchResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  const signal = opts.signal
    ? AbortSignal.any([AbortSignal.timeout(8000), opts.signal])
    : AbortSignal.timeout(8000);

  const response = await apiFetch(`${API_BASE_URL}/logs/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (response.status === 401) {
    signalSessionExpired();
  }

  const body = await parseJsonResponse<unknown>(response);
  return normalizeSearchResponse(body);
}

// ===== Systems (authenticated; write ops ADMIN only) =====
// A key is scoped to a System, not directly to the org (PLAN.md T9-T12).

export interface SystemInfo {
  id: number;
  name: string;
  organizationId: number;
  createdAt: string;
}

export async function listSystems(): Promise<SystemInfo[]> {
  const response = await apiFetch(`${API_BASE_URL}/systems`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<SystemInfo[]>(response);
}

export async function createSystem(name: string): Promise<SystemInfo> {
  const response = await apiFetch(`${API_BASE_URL}/systems`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<SystemInfo>(response);
}

/**
 * Fails with a 409 (surfaced via ApiError.message) if the system still has
 * an active API key -- revoke it first via revokeApiKey(). A system whose
 * only keys are already revoked deletes cleanly; the backend clears those
 * rows itself.
 */
export async function deleteSystem(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/systems/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, (body && body.message) || "Couldn't delete the system");
  }
}

// ===== API keys (authenticated, ADMIN only) =====

/**
 * The raw key is only ever returned here -- the server stores it hashed and
 * cannot show it again. listApiKeys() (B5) surfaces everything else: a
 * masked hint, creation date, owning system, and whether it's been revoked.
 */
export async function generateApiKey(systemId: number): Promise<string> {
  const response = await apiFetch(`${API_BASE_URL}/systems/${systemId}/keys`, {
    method: "POST",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 401) {
    signalSessionExpired();
  }

  const body = await parseJsonResponse<{ apiKey: string }>(response);
  return body.apiKey;
}

export interface ApiKeyInfo {
  id: number;
  maskedHint: string;
  createdAt: string;
  revoked: boolean;
  systemId: number | null;
  systemName: string | null;
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const response = await apiFetch(`${API_BASE_URL}/keys`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<ApiKeyInfo[]>(response);
}

/** Soft revoke -- the key row stays for audit history, it just stops authenticating. */
export async function revokeApiKey(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/keys/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, (body && body.message) || "Couldn't revoke the key");
  }
}

// ===== Team: users & invites (authenticated, most ADMIN only) =====

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function listUsers(): Promise<TeamUser[]> {
  const response = await apiFetch(`${API_BASE_URL}/users`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<TeamUser[]>(response);
}

export async function updateUserRole(id: number, role: "ADMIN" | "USER"): Promise<TeamUser> {
  const response = await apiFetch(`${API_BASE_URL}/users/${id}/role`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<TeamUser>(response);
}

export async function createInvite(): Promise<Invite> {
  const response = await apiFetch(`${API_BASE_URL}/invites`, {
    method: "POST",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<Invite>(response);
}

// T36: an invite code is a bearer credential into the org until it expires
// or is redeemed -- list/revoke so an admin isn't stuck waiting one out.
export interface InviteListItem {
  id: number;
  code: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export async function listInvites(): Promise<InviteListItem[]> {
  const response = await apiFetch(`${API_BASE_URL}/invites`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<InviteListItem[]>(response);
}

export async function revokeInvite(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/invites/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, (body && body.message) || "Couldn't revoke the invite");
  }
}

// ===== Service display aliases (authenticated; write ops ADMIN only) =====
// There's no Service entity -- rawServiceName is free text on every LogEntry.
// This is a read-time label lookup only; it never rewrites indexed data.

export interface ServiceAlias {
  rawServiceName: string;
  displayName: string;
}

export async function listServiceAliases(): Promise<ServiceAlias[]> {
  const response = await apiFetch(`${API_BASE_URL}/service-aliases`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<ServiceAlias[]>(response);
}

export async function upsertServiceAlias(rawServiceName: string, displayName: string): Promise<ServiceAlias> {
  const response = await apiFetch(`${API_BASE_URL}/service-aliases`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ rawServiceName, displayName }),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<ServiceAlias>(response);
}

export async function deleteServiceAlias(rawServiceName: string): Promise<void> {
  const response = await apiFetch(
    `${API_BASE_URL}/service-aliases?rawServiceName=${encodeURIComponent(rawServiceName)}`,
    { method: "DELETE", headers: authHeaders(), signal: AbortSignal.timeout(8000) }
  );
  if (response.status === 401) signalSessionExpired();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, (body && body.message) || "Couldn't remove the alias");
  }
}

// ===== Alert rules (ADMIN only) + the alerts SSE channel (any org member) =====
// PLAN.md T20-T22: AlertRule CRUD is entirely ADMIN-gated, unlike Systems/
// service aliases which allow any authenticated member to read -- there is
// no read-only carve-out here. The alerts SSE channel is the opposite: any
// org member can watch it fire, same as the log stream.

export type AlertMetric = "ERROR_RATE" | "VOLUME_ZSCORE" | "ENTROPY";

export interface AlertRule {
  id: number;
  name: string;
  metric: AlertMetric;
  threshold: number;
  windowSeconds: number;
  targetEmails: string[];
  enabled: boolean;
  organizationId: number;
  createdAt: string;
}

export interface AlertRuleInput {
  name: string;
  metric: AlertMetric;
  threshold: number;
  windowSeconds: number;
  targetEmails: string[];
  enabled: boolean;
}

export interface AlertEvent {
  ruleId: number;
  ruleName: string;
  metric: string;
  detail: string;
  triggeredAt: string; // ISO-8601 instant
}

export async function listAlertRules(): Promise<AlertRule[]> {
  const response = await apiFetch(`${API_BASE_URL}/alert-rules`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<AlertRule[]>(response);
}

export async function createAlertRule(input: AlertRuleInput): Promise<AlertRule> {
  const response = await apiFetch(`${API_BASE_URL}/alert-rules`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<AlertRule>(response);
}

export async function updateAlertRule(id: number, input: AlertRuleInput): Promise<AlertRule> {
  const response = await apiFetch(`${API_BASE_URL}/alert-rules/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<AlertRule>(response);
}

export async function deleteAlertRule(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/alert-rules/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, (body && body.message) || "Couldn't delete the rule");
  }
}

/**
 * Same manual fetch-and-parse approach as subscribeToLogStream, for the same
 * reason (EventSource can't attach an Authorization header) -- see that
 * function's comment for the full rationale. Kept as a separate function
 * rather than a generic "subscribe to any channel" helper because the two
 * event shapes (LogEntry vs AlertEvent) and event names ("log" vs "alert")
 * differ enough that a shared abstraction would need callback-driven type
 * parameters for no real reduction in code.
 */
export function subscribeToAlertStream(
  onAlert: (event: AlertEvent) => void,
  onError?: (err: unknown) => void
): () => void {
  const token = getToken();
  if (!token) {
    return () => {};
  }

  let stopped = false;
  let controller = new AbortController();
  let retryDelay = SSE_RETRY_BASE_MS;

  async function connect() {
    controller = new AbortController();
    try {
      const response = await apiFetch(`${API_BASE_URL}/alerts/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error: ${response.status}`);
      }

      retryDelay = SSE_RETRY_BASE_MS;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          let eventName = "message";
          let data = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (eventName === "alert" && data) {
            try {
              onAlert(JSON.parse(data) as AlertEvent);
            } catch {
              // ignore a malformed event payload
            }
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        return;
      }
      onError?.(err);
    }

    if (stopped) return;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    retryDelay = Math.min(retryDelay * 2, SSE_RETRY_MAX_MS);
    if (!stopped) connect();
  }

  connect();

  return () => {
    stopped = true;
    controller.abort();
  };
}

// ===== Audit log (ADMIN only) =====
// PLAN.md T24: every admin-facing mutation (and login) is recorded org-scoped.
// Reads are paginated -- history grows unboundedly otherwise -- and purge is
// a caller-chosen retention window, not a silent background sweep.

export interface AuditLogEntry {
  id: number;
  actorEmail: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  size: number;
}

export async function listAuditLogs(page = 0, size = 50): Promise<AuditLogPage> {
  const response = await apiFetch(`${API_BASE_URL}/audit-logs?page=${page}&size=${size}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<AuditLogPage>(response);
}

export async function purgeAuditLogs(olderThanDays: number): Promise<{ deleted: number }> {
  const response = await apiFetch(`${API_BASE_URL}/audit-logs?olderThanDays=${olderThanDays}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) signalSessionExpired();
  return parseJsonResponse<{ deleted: number }>(response);
}

// ===== Live tail (SSE, authenticated) =====

const SSE_RETRY_BASE_MS = 1000;
const SSE_RETRY_MAX_MS = 15000;

/**
 * Native EventSource can't attach an Authorization header, and the
 * backend's stream endpoint is JWT-authenticated -- so this reads the
 * response body manually via fetch() instead of using EventSource.
 *
 * The stream is meant to stay open indefinitely, so any end -- a thrown
 * error or a clean `done` (proxy idle timeout, backend restart, laptop
 * sleep/wake losing the TCP connection) -- is treated as a dropped
 * connection and retried with capped exponential backoff, not a terminal
 * state. Only an explicit unsubscribe (or an AbortError it causes) stops
 * retrying. Returns that unsubscribe function.
 */
export function subscribeToLogStream(
  onLog: (log: LogEntry) => void,
  onError?: (err: unknown) => void
): () => void {
  const token = getToken();
  if (!token) {
    return () => {};
  }

  let stopped = false;
  let controller = new AbortController();
  let retryDelay = SSE_RETRY_BASE_MS;

  async function connect() {
    controller = new AbortController();
    try {
      const response = await apiFetch(`${API_BASE_URL}/logs/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error: ${response.status}`);
      }

      // Reached a working connection -- forget any prior backoff.
      retryDelay = SSE_RETRY_BASE_MS;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          let eventName = "message";
          let data = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (eventName === "log" && data) {
            try {
              onLog(JSON.parse(data) as LogEntry);
            } catch {
              // ignore a malformed event payload
            }
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        return; // intentional unsubscribe -- don't reconnect
      }
      onError?.(err);
    }

    if (stopped) return;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    retryDelay = Math.min(retryDelay * 2, SSE_RETRY_MAX_MS);
    if (!stopped) connect();
  }

  connect();

  return () => {
    stopped = true;
    controller.abort();
  };
}

// ===== Demo mode data (public marketing/demo view only) =====

const MOCK_SERVICES = [
  "auth-service",
  "api-gateway",
  "ingest-worker",
  "pattern-engine",
  "rabbitmq-consumer",
  "rate-limiter",
  "elasticsearch-writer",
  "anomaly-detector",
];

const MOCK_MESSAGES: Record<string, string[]> = {
  INFO: [
    "User login successful uid={uid} ip={ip}",
    "Pattern match — cluster_size={n} pattern=user_login_success",
    "Queue depth {n} msgs — consumer_lag={ms}ms",
    "Request completed status=200 duration={ms}ms endpoint={ep}",
    "Health check passed — all dependencies reachable",
    "Cache warmed — {n} entries loaded from Redis",
    "Batch flushed batch_id={b} size={n} records",
  ],
  WARN: [
    "Rate limit threshold 85% — uid={uid} endpoint=/api/logs",
    "Slow query detected — {ms}ms threshold=500ms table=log_entries",
    "Memory usage at 78% — consider scaling worker count",
    "Retry #{n} for batch_id={b} — upstream timeout",
    "Disk usage 72% on /var/data — initiate log rotation",
  ],
  ERROR: [
    "Upstream timeout after 5000ms — retrying batch_id={b}",
    "Failed to connect to Elasticsearch — attempt {n}/3",
    "Pattern hash collision detected hash={h} — flagging for review",
    "Consumer disconnected unexpectedly queue=log.ingest.primary",
    "Anomaly detected: error spike +340% on auth-service",
  ],
  DEBUG: [
    "Cleansing pipeline stage=tokenize input_len={n}",
    "SHA-256 computed hash={h} for pattern template",
    "Channel buffer at {n}% capacity — throttling producers",
    "Checkpoint saved offset={n} partition=0",
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template: string): string {
  return template
    .replace("{uid}", `u_${Math.floor(Math.random() * 9000) + 1000}`)
    .replace("{ip}", `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`)
    .replace("{n}", String(Math.floor(Math.random() * 9000) + 100))
    .replace("{ms}", String(Math.floor(Math.random() * 4900) + 1))
    .replace("{ep}", randomFrom(["/api/logs", "/api/auth", "/api/metrics", "/api/stream"]))
    .replace("{b}", `b_${Math.floor(Math.random() * 9000) + 1000}`)
    .replace("{h}", Math.random().toString(16).slice(2, 10))
    .replace("{n}", String(Math.floor(Math.random() * 5) + 1));
}

export function generateMockLog(): LogEntry {
  const levels = ["INFO", "INFO", "INFO", "WARN", "ERROR", "DEBUG"];
  const level = randomFrom(levels);
  const templates = MOCK_MESSAGES[level] || MOCK_MESSAGES.INFO;
  const template = randomFrom(templates);

  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    level,
    serviceName: randomFrom(MOCK_SERVICES),
    message: fillTemplate(template),
    patternHash: Math.random().toString(16).slice(2, 18),
  };
}

export function fetchDemoLogs(count = 25): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const log = generateMockLog();
    log.timestamp = new Date(now - i * 250 - Math.floor(Math.random() * 100)).toISOString();
    logs.push(log);
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
