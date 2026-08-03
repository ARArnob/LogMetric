package org.example.logmetricapi.dto;

public class ServiceAliasResponse {

    private String rawServiceName;
    private String displayName;

    public ServiceAliasResponse(String rawServiceName, String displayName) {
        this.rawServiceName = rawServiceName;
        this.displayName = displayName;
    }

    public String getRawServiceName() {
        return rawServiceName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
