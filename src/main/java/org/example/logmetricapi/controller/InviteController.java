package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.InviteResponse;
import org.example.logmetricapi.model.InviteToken;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.service.InviteService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    private final InviteService inviteService;
    private final OrganizationRepository organizationRepository;

    public InviteController(InviteService inviteService, OrganizationRepository organizationRepository) {
        this.inviteService = inviteService;
        this.organizationRepository = organizationRepository;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<InviteResponse> createInvite() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        Organization organization = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        InviteToken invite = inviteService.createInvite(organization);

        return ResponseEntity.ok(new InviteResponse(invite.getCode(), invite.getExpiresAt().toInstant().toString()));
    }
}
