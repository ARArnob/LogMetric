package org.example.logmetricapi.dto;

public class CurrentUserResponse {

    private String email;
    private String role;
    private Long organizationId;
    private String organizationName;

    public CurrentUserResponse(String email, String role, Long organizationId, String organizationName) {
        this.email = email;
        this.role = role;
        this.organizationId = organizationId;
        this.organizationName = organizationName;
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

    public String getOrganizationName() {
        return organizationName;
    }
}
