package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateOrganizationRequest {

    @NotBlank(message = "Organization name is required")
    private String name;

    public UpdateOrganizationRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
