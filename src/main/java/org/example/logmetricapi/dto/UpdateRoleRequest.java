package org.example.logmetricapi.dto;

import jakarta.validation.constraints.NotNull;
import org.example.logmetricapi.model.Role;

public class UpdateRoleRequest {

    @NotNull(message = "Role is required")
    private Role role;

    public UpdateRoleRequest() {
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
