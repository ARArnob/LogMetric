export interface LogEntry {
  id: string;
  timestamp: number;
  level: string;
  serviceName: string;
  message: string;
  userId?: string;
  patternHash?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Mock data for demo mode when backend is unavailable
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

function generateMockLog(): LogEntry {
  const levels = ["INFO", "INFO", "INFO", "WARN", "ERROR", "DEBUG"];
  const level = randomFrom(levels);
  const templates = MOCK_MESSAGES[level] || MOCK_MESSAGES.INFO;
  const template = randomFrom(templates);

  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    level,
    serviceName: randomFrom(MOCK_SERVICES),
    message: fillTemplate(template),
    patternHash: Math.random().toString(16).slice(2, 18),
  };
}

function generateMockLogs(count = 20): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const log = generateMockLog();
    log.timestamp = now - i * 250 - Math.floor(Math.random() * 100);
    logs.push(log);
  }
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchLogs(level?: string): Promise<LogEntry[]> {
  try {
    const url = level
      ? `${API_BASE_URL}/logs?level=${level}`
      : `${API_BASE_URL}/logs`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`Error fetching logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data as LogEntry[];
  } catch {
    // Fall back to mock data when backend is unreachable (demo mode)
    return generateMockLogs(25);
  }
}

export { generateMockLog };
