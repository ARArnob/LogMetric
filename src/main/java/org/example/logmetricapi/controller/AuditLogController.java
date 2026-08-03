package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.AuditLogPageResponse;
import org.example.logmetricapi.dto.AuditLogResponse;
import org.example.logmetricapi.model.AuditLog;
import org.example.logmetricapi.repository.AuditLogRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
import java.time.temporal.ChronoUnit;
import java.util.Map;

// T24 (PLAN.md): org-scoped, ADMIN-only. Reads are paginated (audit history
// grows unboundedly otherwise); the DELETE endpoint is the "retention/purge"
// half of the task -- an admin chooses how far back to purge, there is no
// silent background sweep deleting history on its own schedule.
@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize("hasAuthority('ADMIN')")
public class AuditLogController {

    private static final int MAX_PAGE_SIZE = 200;

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<AuditLogPageResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        int clampedSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int clampedPage = Math.max(page, 0);
        Page<AuditLog> result = auditLogRepository.findByOrganizationIdOrderByCreatedAtDesc(
                orgId, PageRequest.of(clampedPage, clampedSize));

        AuditLogPageResponse body = new AuditLogPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getTotalElements(),
                clampedPage,
                clampedSize
        );
        return ResponseEntity.ok(body);
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Map<String, Long>> purge(@RequestParam int olderThanDays) {
        if (olderThanDays < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "olderThanDays must be at least 1");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        Timestamp cutoff = Timestamp.from(Instant.now().minus(olderThanDays, ChronoUnit.DAYS));
        long deleted = auditLogRepository.deleteByOrganizationIdAndCreatedAtBefore(orgId, cutoff);

        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getActorEmail(),
                log.getAction().name(),
                log.getDetail(),
                log.getCreatedAt().toInstant().toString()
        );
    }
}
