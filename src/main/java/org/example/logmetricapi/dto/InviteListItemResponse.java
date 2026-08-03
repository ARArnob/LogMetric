package org.example.logmetricapi.dto;

public class InviteListItemResponse {

    private Long id;
    private String code;
    private String createdAt;
    private String expiresAt;
    private boolean used;

    public InviteListItemResponse(Long id, String code, String createdAt, String expiresAt, boolean used) {
        this.id = id;
        this.code = code;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.used = used;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public boolean isUsed() {
        return used;
    }
}
