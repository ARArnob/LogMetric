package org.example.logmetricapi.dto;

public class OrganizationResponse {

    private Long id;
    private String name;

    public OrganizationResponse(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
