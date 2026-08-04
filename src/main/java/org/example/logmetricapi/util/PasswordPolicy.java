package org.example.logmetricapi.util;

/**
 * Shared strength rule for every endpoint that sets a password (register,
 * register-with-invite, reset-password, change-password). Length alone
 * (the pre-existing @Size(min=8)) let through things like "aaaaaaaa" or
 * "12345678" -- this closes that gap without full composition rules
 * (no symbol requirement), which NIST SP 800-63B argues push users toward
 * predictable patterns like "Password1!" for little real benefit.
 */
public final class PasswordPolicy {

    public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$";
    public static final String MESSAGE =
            "Password must contain an uppercase letter, a lowercase letter, and a number";

    private PasswordPolicy() {
    }
}
