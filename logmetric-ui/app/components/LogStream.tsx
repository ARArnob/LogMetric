"use client";

import { useEffect, useState } from "react";
import { fetchLogs, LogEntry } from "../lib/api";
import { AlertCircle, Info, AlertTriangle, Activity } from "lucide-react";

export default function LogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLogs() {
      try {
        const data = await fetchLogs();
        if (mounted) {
          setLogs(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to fetch logs");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return <AlertCircle className="w-3.5 h-3.5" />;
      case "WARN":
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case "INFO":
        return <Info className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "text-red-700 bg-red-50 border border-red-100";
      case "WARN":
        return "text-amber-700 bg-amber-50 border border-amber-100";
      case "INFO":
        return "text-blue-700 bg-blue-50 border border-blue-100";
      default:
        return "text-slate-600 bg-slate-100 border border-slate-200";
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Live Data Stream
        </h2>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {error ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </>
            )}
          </span>
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">
            {error ? "Connection Error" : "System Online"}
          </span>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap text-slate-600">
          <thead className="bg-slate-50/50 text-slate-400 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Level</th>
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4 w-full">Message</th>
              <th className="px-6 py-4">Pattern Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Initializing log stream...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                  {error ? (
                    <span className="text-red-500 bg-red-50 px-4 py-2 rounded-lg font-medium">{error}</span>
                  ) : (
                    "No logs available in the system."
                  )}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id || log.timestamp} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest shadow-sm ${getLevelColor(log.level)}`}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {log.serviceName}
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-lg" title={log.message}>
                    {log.message}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors">
                    {log.patternHash ? log.patternHash.substring(0, 8) + '...' : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
