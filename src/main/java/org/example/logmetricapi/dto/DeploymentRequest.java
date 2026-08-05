package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DeploymentRequest {

    private Long systemId;

    @NotBlank(message = "Version is required")
    @Size(max = 100, message = "Version must be at most 100 characters")
    private String version;

    @Size(max = 500, message = "Notes must be at most 500 characters")
    private String notes;

    private Long deployedAt;

    public Long getSystemId() {
        return systemId;
    }

    public void setSystemId(Long systemId) {
        this.systemId = systemId;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getDeployedAt() {
        return deployedAt;
    }

    public void setDeployedAt(Long deployedAt) {
        this.deployedAt = deployedAt;
    }
}
