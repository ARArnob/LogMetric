package org.example.logmetricapi.service;

import org.example.logmetricapi.model.ApiKey;
import org.example.logmetricapi.model.Organization;
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

    public String generateKey(Organization org) {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        String rawKey = "lm_" + uuid;
        String keyPrefix = rawKey.substring(0, 8);
        String hashedKey = HashUtil.hash(rawKey);

        ApiKey apiKey = new ApiKey();
        apiKey.setOrganization(org);
        apiKey.setKeyPrefix(keyPrefix);
        apiKey.setHashedKey(hashedKey);
        apiKey.setCreatedAt(Timestamp.from(Instant.now()));
        apiKey.setRevoked(false);

        apiKeyRepository.save(apiKey);

        return rawKey;
    }

    public Organization validateKey(String rawKey) {
        if (rawKey == null || rawKey.isEmpty()) {
            return null;
        }
        String hashedKey = HashUtil.hash(rawKey);
        Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByHashedKey(hashedKey);

        if (apiKeyOpt.isPresent()) {
            ApiKey apiKey = apiKeyOpt.get();
            if (!apiKey.isRevoked()) {
                return apiKey.getOrganization();
            }
        }
        return null;
    }
}
