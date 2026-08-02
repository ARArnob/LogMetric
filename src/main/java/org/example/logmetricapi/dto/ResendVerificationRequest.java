package org.example.logmetricapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ResendVerificationRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid address")
    private String email;

    public ResendVerificationRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
