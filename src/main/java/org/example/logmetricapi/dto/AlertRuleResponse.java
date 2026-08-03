package org.example.logmetricapi.dto;

import java.util.Set;

public class AlertRuleResponse {

    private Long id;
    private String name;
    private String metric;
    private double threshold;
    private int windowSeconds;
    private Set<String> targetEmails;
    private boolean enabled;
    private Long organizationId;
    private String createdAt;

    public AlertRuleResponse(Long id, String name, String metric, double threshold, int windowSeconds,
                              Set<String> targetEmails, boolean enabled, Long organizationId, String createdAt) {
        this.id = id;
        this.name = name;
        this.metric = metric;
        this.threshold = threshold;
        this.windowSeconds = windowSeconds;
        this.targetEmails = targetEmails;
        this.enabled = enabled;
        this.organizationId = organizationId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getMetric() {
        return metric;
    }

    public double getThreshold() {
        return threshold;
    }

    public int getWindowSeconds() {
        return windowSeconds;
    }

    public Set<String> getTargetEmails() {
        return targetEmails;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
