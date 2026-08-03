package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.SystemRequest;
import org.example.logmetricapi.dto.SystemResponse;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.SystemEntity;
import org.example.logmetricapi.repository.ApiKeyRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.SystemRepository;
import org.example.logmetricapi.service.ApiKeyService;
import org.example.logmetricapi.service.AuditLogService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems")
public class SystemController {

    private final SystemRepository systemRepository;
    private final OrganizationRepository organizationRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final ApiKeyService apiKeyService;
    private final AuditLogService auditLogService;

    public SystemController(SystemRepository systemRepository,
                              OrganizationRepository organizationRepository,
                              ApiKeyRepository apiKeyRepository,
                              ApiKeyService apiKeyService,
                              AuditLogService auditLogService) {
        this.systemRepository = systemRepository;
        this.organizationRepository = organizationRepository;
        this.apiKeyRepository = apiKeyRepository;
        this.apiKeyService = apiKeyService;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<SystemResponse> createSystem(@Valid @RequestBody SystemRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        SystemEntity system = new SystemEntity();
        system.setName(request.getName());
        system.setOrganization(org);
        system.setCreatedAt(Timestamp.from(Instant.now()));
        system = systemRepository.save(system);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.SYSTEM_CREATED, system.getName());

        return ResponseEntity.ok(toResponse(system));
    }

    // No @PreAuthorize -- every org member needs to see the org's systems to
    // pick one when generating a key, not just admins (same read-vs-write
    // split as GET /api/service-aliases).
    @GetMapping
    public ResponseEntity<List<SystemResponse>> listSystems() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        List<SystemResponse> systems = systemRepository.findByOrganizationId(orgId).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(systems);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteSystem(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        SystemEntity system = systemRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found"));

        long activeKeyCount = apiKeyRepository.countBySystemIdAndRevokedFalse(id);
        if (activeKeyCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This system has " + activeKeyCount + " active API key(s) -- revoke them first");
        }
        // Any keys left at this point are already revoked and can never
        // authenticate again -- clear them out so their FK reference doesn't
        // block deleting the system itself.
        apiKeyRepository.deleteBySystemId(id);

        systemRepository.delete(system);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.SYSTEM_DELETED, system.getName());

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/keys")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Map<String, String>> generateKey(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        SystemEntity system = systemRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found"));

        String rawKey = apiKeyService.generateKey(system);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.KEY_GENERATED, system.getName());
        return ResponseEntity.ok(Map.of("apiKey", rawKey));
    }

    private SystemResponse toResponse(SystemEntity system) {
        return new SystemResponse(
                system.getId(),
                system.getName(),
                system.getOrganization().getId(),
                system.getCreatedAt().toInstant().toString()
        );
    }
}
