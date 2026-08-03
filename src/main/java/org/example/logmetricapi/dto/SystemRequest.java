package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;

public class SystemRequest {

    @NotBlank(message = "System name is required")
    private String name;

    public SystemRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
