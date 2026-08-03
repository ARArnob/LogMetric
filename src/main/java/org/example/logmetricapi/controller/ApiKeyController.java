package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.ApiKeyResponse;
import org.example.logmetricapi.model.ApiKey;
import org.example.logmetricapi.repository.ApiKeyRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// B5 (UI-PLAN.md): list key metadata only -- the raw key is never
// retrievable after generation (POST /api/systems/{id}/keys), by design.
@RestController
@RequestMapping("/api/keys")
public class ApiKeyController {

    private final ApiKeyRepository apiKeyRepository;

    public ApiKeyController(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    // ADMIN-only, matching key generation's existing gate -- Settings' whole
    // API key section is already admin-only in the frontend (ApiKeySection.tsx).
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<ApiKeyResponse>> listKeys() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        List<ApiKeyResponse> keys = apiKeyRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(keys);
    }

    private ApiKeyResponse toResponse(ApiKey apiKey) {
        Long systemId = apiKey.getSystem() != null ? apiKey.getSystem().getId() : null;
        String systemName = apiKey.getSystem() != null ? apiKey.getSystem().getName() : null;
        return new ApiKeyResponse(
                apiKey.getId(),
                apiKey.getKeyPrefix() + "…",
                apiKey.getCreatedAt().toInstant().toString(),
                apiKey.isRevoked(),
                systemId,
                systemName
        );
    }
}
