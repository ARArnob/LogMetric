package org.example.logmetricapi.dto;

public class ApiKeyResponse {

    private Long id;
    private String maskedHint;
    private String createdAt;
    private boolean revoked;
    private Long systemId;
    private String systemName;

    public ApiKeyResponse(Long id, String maskedHint, String createdAt, boolean revoked,
                           Long systemId, String systemName) {
        this.id = id;
        this.maskedHint = maskedHint;
        this.createdAt = createdAt;
        this.revoked = revoked;
        this.systemId = systemId;
        this.systemName = systemName;
    }

    public Long getId() {
        return id;
    }

    public String getMaskedHint() {
        return maskedHint;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public Long getSystemId() {
        return systemId;
    }

    public String getSystemName() {
        return systemName;
    }
}
