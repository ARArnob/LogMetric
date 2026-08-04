package org.example.logmetricapi.service;

import org.example.logmetricapi.model.ApiKey;
import org.example.logmetricapi.model.ApiKeyPrincipal;
import org.example.logmetricapi.model.SystemEntity;
import org.example.logmetricapi.repository.ApiKeyRepository;
import org.example.logmetricapi.util.HashUtil;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.Optional;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;

    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    public String generateKey(SystemEntity system) {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        String rawKey = "lm_" + uuid;
        String keyPrefix = rawKey.substring(0, 8);
        String hashedKey = HashUtil.hash(rawKey);

        ApiKey apiKey = new ApiKey();
        apiKey.setOrganization(system.getOrganization());
        apiKey.setSystem(system);
        apiKey.setKeyPrefix(keyPrefix);
        apiKey.setHashedKey(hashedKey);
        apiKey.setCreatedAt(Timestamp.from(Instant.now()));
        apiKey.setRevoked(false);

        apiKeyRepository.save(apiKey);

        return rawKey;
    }

    /**
     * The validation cache is keyed by the raw key, but revocation only ever has the
     * hashed key (raw keys are never stored, so there's nothing to evict by directly).
     * Revocation is rare, so clearing every cached entry org-wide is a fine trade for
     * not letting a just-revoked key keep authenticating out of the cache for up to
     * apiKeys' TTL -- ApiKeyController.revokeKey() calls this after persisting the flip.
     */
    @org.springframework.cache.annotation.CacheEvict(value = "apiKeys", allEntries = true)
    public void invalidateAll() {
    }

    @org.springframework.cache.annotation.Cacheable(value = "apiKeys", key = "#rawKey", unless = "#result == null")
    public ApiKeyPrincipal validateKey(String rawKey) {
        if (rawKey == null || rawKey.isEmpty()) {
            return null;
        }
        String hashedKey = HashUtil.hash(rawKey);
        Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByHashedKey(hashedKey);

        if (apiKeyOpt.isPresent()) {
            ApiKey apiKey = apiKeyOpt.get();
            if (!apiKey.isRevoked()) {
                Long systemId = apiKey.getSystem() != null ? apiKey.getSystem().getId() : null;
                return new ApiKeyPrincipal(apiKey.getOrganization().getId(), systemId);
            }
        }
        return null;
    }
}
