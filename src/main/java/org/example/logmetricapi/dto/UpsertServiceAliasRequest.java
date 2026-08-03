package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotBlank;

public class UpsertServiceAliasRequest {

    @NotBlank(message = "rawServiceName is required")
    private String rawServiceName;

    @NotBlank(message = "displayName is required")
    private String displayName;

    public UpsertServiceAliasRequest() {
    }

    public String getRawServiceName() {
        return rawServiceName;
    }

    public void setRawServiceName(String rawServiceName) {
        this.rawServiceName = rawServiceName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
