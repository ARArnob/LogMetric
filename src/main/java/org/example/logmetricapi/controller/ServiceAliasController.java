package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.ServiceAliasResponse;
import org.example.logmetricapi.dto.UpsertServiceAliasRequest;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.ServiceAlias;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.ServiceAliasRepository;
import org.example.logmetricapi.service.AuditLogService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * T43: display-only aliases for the free-text serviceName carried on every
 * LogEntry. There is no Service entity to rename -- rawServiceName stays the
 * single source of truth for ingestion/filtering/aggregation everywhere else
 * in the app; this table is purely a read-time label lookup.
 */
@RestController
@RequestMapping("/api/service-aliases")
public class ServiceAliasController {

    private final ServiceAliasRepository serviceAliasRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditLogService auditLogService;

    public ServiceAliasController(ServiceAliasRepository serviceAliasRepository,
                                    OrganizationRepository organizationRepository,
                                    AuditLogService auditLogService) {
        this.serviceAliasRepository = serviceAliasRepository;
        this.organizationRepository = organizationRepository;
        this.auditLogService = auditLogService;
    }

    // Any authenticated org member can read the alias map -- it's just
    // display labels, needed to render Explorer/Dashboard/Patterns/live tail
    // correctly for everyone, not only admins.
    @GetMapping
    public ResponseEntity<List<ServiceAliasResponse>> list() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        List<ServiceAliasResponse> aliases = serviceAliasRepository.findByOrganizationId(orgId).stream()
                .map(a -> new ServiceAliasResponse(a.getRawServiceName(), a.getDisplayName()))
                .toList();

        return ResponseEntity.ok(aliases);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ServiceAliasResponse> upsert(@Valid @RequestBody UpsertServiceAliasRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        ServiceAlias alias = serviceAliasRepository
                .findByOrganizationIdAndRawServiceName(orgId, request.getRawServiceName())
                .orElseGet(() -> {
                    ServiceAlias created = new ServiceAlias();
                    Organization org = organizationRepository.getReferenceById(orgId);
                    created.setOrganization(org);
                    created.setRawServiceName(request.getRawServiceName());
                    created.setCreatedAt(Timestamp.from(Instant.now()));
                    return created;
                });
        alias.setDisplayName(request.getDisplayName());
        serviceAliasRepository.save(alias);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.SERVICE_ALIAS_SET, alias.getRawServiceName() + " -> " + alias.getDisplayName());

        return ResponseEntity.ok(new ServiceAliasResponse(alias.getRawServiceName(), alias.getDisplayName()));
    }

    // rawServiceName as a query param, not a path segment, so arbitrary
    // client-supplied service names (dots, slashes, spaces) never collide
    // with path routing/encoding.
    @DeleteMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    @Transactional
    public ResponseEntity<Void> delete(@RequestParam String rawServiceName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        serviceAliasRepository.deleteByOrganizationIdAndRawServiceName(orgId, rawServiceName);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.SERVICE_ALIAS_DELETED, rawServiceName);
        return ResponseEntity.noContent().build();
    }
}
