package org.example.logmetricapi.service;

import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.AuditLog;
import org.example.logmetricapi.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(Long organizationId, String actorEmail, AuditAction action, String detail) {
        AuditLog entry = new AuditLog();
        entry.setOrganizationId(organizationId);
        entry.setActorEmail(actorEmail);
        entry.setAction(action);
        entry.setDetail(detail);
        entry.setCreatedAt(Timestamp.from(Instant.now()));
        auditLogRepository.save(entry);
    }
}
