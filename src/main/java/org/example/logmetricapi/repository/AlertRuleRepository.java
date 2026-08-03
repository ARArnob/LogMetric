package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {
    List<AlertRule> findByOrganizationId(Long organizationId);

    Optional<AlertRule> findByIdAndOrganizationId(Long id, Long organizationId);

    List<AlertRule> findByEnabledTrue();
}
