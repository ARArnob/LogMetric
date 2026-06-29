export interface LogEntry {
  id: string;
  timestamp: number;
  level: string;
  serviceName: string;
  message: string;
  userId?: string;
  patternHash?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export async function fetchLogs(level?: string): Promise<LogEntry[]> {
  try {
    const url = level ? `${API_BASE_URL}/logs?level=${level}` : `${API_BASE_URL}/logs`;
    
    // Use no-store to always get fresh data
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data as LogEntry[];
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    throw error;
  }
}
