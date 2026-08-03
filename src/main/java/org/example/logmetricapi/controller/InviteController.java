package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.InviteListItemResponse;
import org.example.logmetricapi.dto.InviteResponse;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.InviteToken;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.InviteTokenRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.service.AuditLogService;
import org.example.logmetricapi.service.InviteService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/invites")
@PreAuthorize("hasAuthority('ADMIN')")
public class InviteController {

    private final InviteService inviteService;
    private final OrganizationRepository organizationRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final AuditLogService auditLogService;

    public InviteController(InviteService inviteService,
                              OrganizationRepository organizationRepository,
                              InviteTokenRepository inviteTokenRepository,
                              AuditLogService auditLogService) {
        this.inviteService = inviteService;
        this.organizationRepository = organizationRepository;
        this.inviteTokenRepository = inviteTokenRepository;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<InviteResponse> createInvite() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        Organization organization = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        InviteToken invite = inviteService.createInvite(organization);
        // Detail is the invite's id, not its code -- the code is a live bearer
        // credential, and there's no reason to duplicate it into a second,
        // longer-retained table when GET /api/invites already shows it.
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.INVITE_CREATED, "invite #" + invite.getId());

        return ResponseEntity.ok(new InviteResponse(invite.getCode(), invite.getExpiresAt().toInstant().toString()));
    }

    // T36: an invite code is a bearer credential into the org until it
    // expires or is redeemed -- list/revoke so an admin who pastes one into
    // the wrong place, or just forgets about it, isn't stuck waiting it out.
    @GetMapping
    public ResponseEntity<List<InviteListItemResponse>> listInvites() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        List<InviteListItemResponse> invites = inviteTokenRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).stream()
                .map(invite -> new InviteListItemResponse(
                        invite.getId(),
                        invite.getCode(),
                        invite.getCreatedAt().toInstant().toString(),
                        invite.getExpiresAt().toInstant().toString(),
                        invite.isUsed()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(invites);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeInvite(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        // 404, not 403 -- same don't-leak-existence pattern as every other
        // org-scoped resource in this codebase.
        InviteToken invite = inviteTokenRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));

        if (invite.isUsed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This invite has already been redeemed");
        }

        // Reuses the existing "used" flag rather than deleting the row --
        // InviteService.redeem() already rejects any used code with the same
        // generic message, and keeping the row preserves the answer to "who
        // redeemed/revoked this" for later.
        invite.setUsed(true);
        inviteTokenRepository.save(invite);
        auditLogService.record(orgId, AuthUtils.requireUser(authentication).getEmail(),
                AuditAction.INVITE_REVOKED, "invite #" + invite.getId());

        return ResponseEntity.noContent().build();
    }
}
