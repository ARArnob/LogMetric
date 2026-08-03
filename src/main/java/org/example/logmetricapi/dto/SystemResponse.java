package org.example.logmetricapi.dto;

public class SystemResponse {

    private Long id;
    private String name;
    private Long organizationId;
    private String createdAt;

    public SystemResponse(Long id, String name, Long organizationId, String createdAt) {
        this.id = id;
        this.name = name;
        this.organizationId = organizationId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
