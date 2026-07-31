package org.example.logmetricapi.dto;

public class AuthResponse {

    private String token;
    private String email;
    private String role;
    private Long organizationId;

    public AuthResponse(String token, String email, String role, Long organizationId) {
        this.token = token;
        this.email = email;
        this.role = role;
        this.organizationId = organizationId;
    }

    public String getToken() {
        return token;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public Long getOrganizationId() {
        return organizationId;
    }
}
