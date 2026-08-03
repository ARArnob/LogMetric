package org.example.logmetricapi.dto;

/** Returned by register/register-with-invite instead of a token now that both require email verification (T37). */
public class VerificationPendingResponse {

    private String email;
    private String message;

    public VerificationPendingResponse(String email, String message) {
        this.email = email;
        this.message = message;
    }

    public String getEmail() {
        return email;
    }

    public String getMessage() {
        return message;
    }
}
