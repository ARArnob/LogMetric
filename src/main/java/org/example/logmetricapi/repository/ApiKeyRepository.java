package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByHashedKey(String hashedKey);

    List<ApiKey> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    Optional<ApiKey> findByIdAndOrganizationId(Long id, Long organizationId);

    // Only a live (non-revoked) key blocks deleting its system -- a revoked
    // key can never authenticate again (ApiKeyService.validateKey), so it's
    // disposable bookkeeping, not a protected reference.
    long countBySystemIdAndRevokedFalse(Long systemId);

    // Called only once every remaining key for a system is already revoked,
    // to clear the FK reference so the system itself can be deleted --
    // revoking a key doesn't detach it, so the rows would otherwise block it.
    void deleteBySystemId(Long systemId);
}
