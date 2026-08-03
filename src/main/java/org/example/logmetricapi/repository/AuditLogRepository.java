package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.sql.Timestamp;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId, Pageable pageable);

    long deleteByOrganizationIdAndCreatedAtBefore(Long organizationId, Timestamp cutoff);
}
