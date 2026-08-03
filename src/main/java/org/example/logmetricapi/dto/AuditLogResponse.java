package org.example.logmetricapi.dto;

public class AuditLogResponse {

    private Long id;
    private String actorEmail;
    private String action;
    private String detail;
    private String createdAt;

    public AuditLogResponse(Long id, String actorEmail, String action, String detail, String createdAt) {
        this.id = id;
        this.actorEmail = actorEmail;
        this.action = action;
        this.detail = detail;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public String getAction() {
        return action;
    }

    public String getDetail() {
        return detail;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
