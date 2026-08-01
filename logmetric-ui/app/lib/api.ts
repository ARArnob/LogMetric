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
}

export interface LogSearchResponse {
  logs: LogEntry[];
  total: number;
  histogram: Array<Record<string, unknown>>;
  severityDistribution: Array<Record<string, unknown>>;
}

export interface AuthUser {
  email: string;
  role: string;
  organizationId: number;
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

// ===== Config =====

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";

/**
 * Public marketing/demo view: fabricated data, no backend or login
 * required. Gated behind an explicit flag so a real deployment never
 * silently disguises a broken backend as working data.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body && typeof body === "object" && "message" in body && (body as { message?: string }).message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, String(message));
  }
  return (await response.json()) as T;
}

// ===== Auth API =====

export async function login(email: string, password: string): Promise<AuthApiResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
): Promise<AuthApiResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, organizationName }),
  });
  return parseJsonResponse<AuthApiResponse>(response);
}

// ===== Log search (authenticated) =====

export async function searchLogs(request: LogSearchRequest = {}): Promise<LogSearchResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/logs/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 401) {
    clearStoredAuth();
  }

  return parseJsonResponse<LogSearchResponse>(response);
}

// ===== Live tail (SSE, authenticated) =====

/**
 * Native EventSource can't attach an Authorization header, and the
 * backend's stream endpoint is JWT-authenticated -- so this reads the
 * response body manually via fetch() instead of using EventSource.
 * Returns an unsubscribe function.
 */
export function subscribeToLogStream(
  onLog: (log: LogEntry) => void,
  onError?: (err: unknown) => void
): () => void {
  const token = getToken();
  if (!token) {
    return () => {};
  }

  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error: ${response.status}`);
      }

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
      if ((err as { name?: string })?.name !== "AbortError") {
        onError?.(err);
      }
    }
  })();

  return () => controller.abort();
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
