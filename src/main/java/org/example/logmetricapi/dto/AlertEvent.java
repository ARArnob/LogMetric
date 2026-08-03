package org.example.logmetricapi.dto;

/**
 * Wire payload for the org-scoped alerts SSE channel (PLAN.md T22). Never
 * persisted -- purely a transient broadcast message.
 */
public class AlertEvent {

    private Long ruleId;
    private String ruleName;
    private String metric;
    private String detail;
    private String triggeredAt;

    public AlertEvent(Long ruleId, String ruleName, String metric, String detail, String triggeredAt) {
        this.ruleId = ruleId;
        this.ruleName = ruleName;
        this.metric = metric;
        this.detail = detail;
        this.triggeredAt = triggeredAt;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public String getRuleName() {
        return ruleName;
    }

    public String getMetric() {
        return metric;
    }

    public String getDetail() {
        return detail;
    }

    public String getTriggeredAt() {
        return triggeredAt;
    }
}
