package org.example.logmetricapi.util;

import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

public final class AuthUtils {

    private AuthUtils() {
        // Utility class
    }

    /**
     * Resolves the organization id of the authenticated principal (either a
     * JWT-authenticated User or an API-key-authenticated Organization).
     * Throws 401 instead of falling back to a default — every log read/write
     * path must be scoped to a real, authenticated organization.
     */
    public static Long requireOrganizationId(Authentication authentication) {
        if (authentication != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User user && user.getOrganization() != null) {
                return user.getOrganization().getId();
            }
            if (principal instanceof Organization organization) {
                return organization.getId();
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to resolve organization for authenticated request");
    }

    public static String requireOrganizationIdAsString(Authentication authentication) {
        return String.valueOf(requireOrganizationId(authentication));
    }

    /**
     * Resolves the authenticated User entity itself (not just its org id).
     * Only meaningful for JWT-authenticated requests -- API-key-authenticated
     * requests carry an Organization principal with no associated user.
     */
    public static User requireUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This operation requires a user account, not an API key");
    }
}
