package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.ApiKeyResponse;
import org.example.logmetricapi.model.ApiKey;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.repository.ApiKeyRepository;
import org.example.logmetricapi.service.ApiKeyService;
import org.example.logmetricapi.service.AuditLogService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

// B5 (UI-PLAN.md): list key metadata only -- the raw key is never
// retrievable after generation (POST /api/systems/{id}/keys), by design.
@RestController
@RequestMapping("/api/keys")
public class ApiKeyController {

    private final ApiKeyRepository apiKeyRepository;
    private final ApiKeyService apiKeyService;
    private final AuditLogService auditLogService;

    public ApiKeyController(ApiKeyRepository apiKeyRepository, ApiKeyService apiKeyService, AuditLogService auditLogService) {
        this.apiKeyRepository = apiKeyRepository;
        this.apiKeyService = apiKeyService;
        this.auditLogService = auditLogService;
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

    // First call soft-revokes (ApiKeyService.validateKey() already rejects a
    // revoked key, and keeping the row preserves "who generated this, when"
    // for the audit trail -- this is also what unblocks deleting a system
    // whose only keys are now revoked, see SystemController.deleteSystem).
    // A second call on an already-revoked key hard-deletes the row, since at
    // that point the audit trail no longer needs it.
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> revokeKey(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        ApiKey apiKey = apiKeyRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Key not found"));

        if (apiKey.isRevoked()) {
            apiKeyRepository.delete(apiKey);
            auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                    AuditAction.KEY_DELETED, apiKey.getKeyPrefix() + "…");
            return ResponseEntity.noContent().build();
        }

        apiKey.setRevoked(true);
        apiKeyRepository.save(apiKey);
        // Otherwise the just-revoked key would keep authenticating out of the
        // validation cache until its TTL elapses.
        apiKeyService.invalidateAll();
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.KEY_REVOKED, apiKey.getKeyPrefix() + "…");

        return ResponseEntity.noContent().build();
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
