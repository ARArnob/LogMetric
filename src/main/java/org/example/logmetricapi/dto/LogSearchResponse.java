package org.example.logmetricapi.dto;

import org.example.logmetricapi.model.LogEntry;
import java.util.List;
import java.util.Map;

public class LogSearchResponse {
    private List<LogEntry> logs;
    private long total;
    private List<Map<String, Object>> histogram;
    private List<Map<String, Object>> severityDistribution;
    private List<Map<String, Object>> serviceNames;
    private List<Map<String, Object>> patternClusters;
    private String histogramInterval;

    public List<LogEntry> getLogs() { return logs; }
    public void setLogs(List<LogEntry> logs) { this.logs = logs; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public List<Map<String, Object>> getHistogram() { return histogram; }
    public void setHistogram(List<Map<String, Object>> histogram) { this.histogram = histogram; }

    public List<Map<String, Object>> getSeverityDistribution() { return severityDistribution; }
    public void setSeverityDistribution(List<Map<String, Object>> severityDistribution) { this.severityDistribution = severityDistribution; }

    public List<Map<String, Object>> getServiceNames() { return serviceNames; }
    public void setServiceNames(List<Map<String, Object>> serviceNames) { this.serviceNames = serviceNames; }

    public List<Map<String, Object>> getPatternClusters() { return patternClusters; }
    public void setPatternClusters(List<Map<String, Object>> patternClusters) { this.patternClusters = patternClusters; }

    public String getHistogramInterval() { return histogramInterval; }
    public void setHistogramInterval(String histogramInterval) { this.histogramInterval = histogramInterval; }
}
