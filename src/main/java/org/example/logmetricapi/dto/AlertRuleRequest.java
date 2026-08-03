package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.example.logmetricapi.model.AlertMetric;

import java.util.HashSet;
import java.util.Set;

/**
 * Used for both create and update -- update is a full replace (PUT), not a
 * partial patch, so every field is always sent by the caller.
 */
public class AlertRuleRequest {

    @NotBlank(message = "Rule name is required")
    private String name;

    @NotNull(message = "Metric is required")
    private AlertMetric metric;

    @NotNull(message = "Threshold is required")
    private Double threshold;

    @NotNull(message = "Window is required")
    @Positive(message = "Window must be a positive number of seconds")
    private Integer windowSeconds;

    private Set<String> targetEmails = new HashSet<>();

    private boolean enabled = true;

    public AlertRuleRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AlertMetric getMetric() {
        return metric;
    }

    public void setMetric(AlertMetric metric) {
        this.metric = metric;
    }

    public Double getThreshold() {
        return threshold;
    }

    public void setThreshold(Double threshold) {
        this.threshold = threshold;
    }

    public Integer getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(Integer windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    public Set<String> getTargetEmails() {
        return targetEmails;
    }

    public void setTargetEmails(Set<String> targetEmails) {
        this.targetEmails = targetEmails;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
