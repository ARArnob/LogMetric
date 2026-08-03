package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.SystemRequest;
import org.example.logmetricapi.dto.SystemResponse;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.SystemEntity;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.SystemRepository;
import org.example.logmetricapi.service.ApiKeyService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final ApiKeyService apiKeyService;

    public SystemController(SystemRepository systemRepository,
                              OrganizationRepository organizationRepository,
                              ApiKeyService apiKeyService) {
        this.systemRepository = systemRepository;
        this.organizationRepository = organizationRepository;
        this.apiKeyService = apiKeyService;
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
    public ResponseEntity<Void> deleteSystem(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        SystemEntity system = systemRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found"));
        systemRepository.delete(system);

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
