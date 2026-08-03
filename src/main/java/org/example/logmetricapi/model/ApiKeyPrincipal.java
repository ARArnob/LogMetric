package org.example.logmetricapi.model;

/**
 * The authenticated identity carried in the SecurityContext for API-key
 * requests (POST /api/logs). Replaces the bare Organization principal now
 * that a key is scoped to a System, not just an Organization -- systemId is
 * nullable only for a key minted before this migration (T10) that has never
 * been re-scoped to a System.
 */
public record ApiKeyPrincipal(Long organizationId, Long systemId) {
}
