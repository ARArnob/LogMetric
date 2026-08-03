package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.OrganizationResponse;
import org.example.logmetricapi.dto.UpdateOrganizationRequest;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.service.AuditLogService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/organizations")
public class OrganizationController {

    private final OrganizationRepository organizationRepository;
    private final AuditLogService auditLogService;

    public OrganizationController(OrganizationRepository organizationRepository, AuditLogService auditLogService) {
        this.organizationRepository = organizationRepository;
        this.auditLogService = auditLogService;
    }

    // No path id -- like /api/invites and /api/keys/generate, this always
    // means "the caller's own organization," scoped by the JWT.
    @PatchMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<OrganizationResponse> updateOrganization(@Valid @RequestBody UpdateOrganizationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        // A name already claimed by a *different* org is rejected -- same
        // rule open registration enforces, checked here excluding ourselves
        // so re-saving the current name isn't treated as a collision.
        organizationRepository.findByName(request.getName())
                .filter(o -> !o.getId().equals(orgId))
                .ifPresent(o -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Organization name is already taken");
                });

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        String previousName = org.getName();
        org.setName(request.getName());
        organizationRepository.save(org);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.ORGANIZATION_RENAMED, previousName + " -> " + org.getName());

        return ResponseEntity.ok(new OrganizationResponse(org.getId(), org.getName()));
    }
}
