package org.example.logmetricapi.dto;

public class DeploymentResponse {

    private Long id;
    private Long systemId;
    private String version;
    private String notes;
    private Long deployedAt;

    public DeploymentResponse(Long id, Long systemId, String version, String notes, Long deployedAt) {
        this.id = id;
        this.systemId = systemId;
        this.version = version;
        this.notes = notes;
        this.deployedAt = deployedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
