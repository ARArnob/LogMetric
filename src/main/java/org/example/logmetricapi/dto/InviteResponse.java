package org.example.logmetricapi.dto;

public class InviteResponse {

    private String code;
    private String expiresAt;

    public InviteResponse(String code, String expiresAt) {
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public String getCode() {
        return code;
    }

    public String getExpiresAt() {
        return expiresAt;
    }
}
