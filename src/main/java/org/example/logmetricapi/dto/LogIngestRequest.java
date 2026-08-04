package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * S4 (SECURITY-TODO.md): dedicated ingest DTO rather than annotating LogEntry (the
 * Elasticsearch document class) directly. id/systemId/patternHash/organizationId are
 * deliberately absent -- those are always server-assigned (LogController/LogConsumer),
 * never client-supplied, so there's nothing here for a caller to tamper with.
 */
public class LogIngestRequest {

    @NotBlank(message = "message is required")
    @Size(max = 10000, message = "message must not exceed 10000 characters")
    private String message;

    @NotBlank(message = "serviceName is required")
    @Size(max = 200, message = "serviceName must not exceed 200 characters")
    private String serviceName;

    @NotBlank(message = "level is required")
    private String level;

    private String userId;
    private Instant timestamp;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
