package org.example.logmetricapi.dto;

import java.util.List;

public class AuditLogPageResponse {

    private List<AuditLogResponse> logs;
    private long total;
    private int page;
    private int size;

    public AuditLogPageResponse(List<AuditLogResponse> logs, long total, int page, int size) {
        this.logs = logs;
        this.total = total;
        this.page = page;
        this.size = size;
    }

    public List<AuditLogResponse> getLogs() {
        return logs;
    }

    public long getTotal() {
        return total;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }
}
