package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {

    // organization and targetEmails are both mapped EAGER, but EAGER only
    // means "always loaded," not "loaded efficiently" -- Hibernate's default
    // strategy for two separately-fetched associations is one extra SELECT
    // per row per association (N+1 x2), not a join. Explicit LEFT JOIN FETCH
    // collapses that back to one query; DISTINCT removes the duplicate root
    // rows the collection join produces.
    @Query("SELECT DISTINCT r FROM AlertRule r " +
            "LEFT JOIN FETCH r.organization " +
            "LEFT JOIN FETCH r.targetEmails " +
            "WHERE r.organization.id = :organizationId")
    List<AlertRule> findByOrganizationId(@Param("organizationId") Long organizationId);

    Optional<AlertRule> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT DISTINCT r FROM AlertRule r " +
            "LEFT JOIN FETCH r.organization " +
            "LEFT JOIN FETCH r.targetEmails " +
            "WHERE r.enabled = true")
    List<AlertRule> findByEnabledTrue();
}
