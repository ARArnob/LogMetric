package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.LogPattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;

@Repository
public interface LogPatternRepository extends JpaRepository<LogPattern, Long> {

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO log_patterns
            (organization_id, pattern_hash, template, sample_message,
             first_seen, last_seen, occurrence_count)
        VALUES (:orgId, :patternHash, :template, :sampleMessage, :now, :now, 1)
        ON CONFLICT (organization_id, pattern_hash)
        DO UPDATE SET last_seen = :now,
                      occurrence_count = log_patterns.occurrence_count + 1
        """, nativeQuery = true)
    void recordOccurrence(@Param("orgId") Long orgId,
                          @Param("patternHash") String patternHash,
                          @Param("template") String template,
                          @Param("sampleMessage") String sampleMessage,
                          @Param("now") Timestamp now);

    Page<LogPattern> findByOrganizationId(Long organizationId, Pageable pageable);

    java.util.List<LogPattern> findByOrganizationIdAndFirstSeenAfter(Long organizationId, Timestamp cutoff);

    java.util.List<LogPattern> findByOrganizationIdAndFirstSeenBetween(Long organizationId, Timestamp start, Timestamp end);

    java.util.List<LogPattern> findByOrganizationIdAndOccurrenceCountGreaterThanEqual(Long organizationId, long minOccurrences);

    java.util.Optional<LogPattern> findByOrganizationIdAndPatternHash(Long organizationId, String patternHash);

    @Query("SELECT COALESCE(SUM(p.occurrenceCount), 0) as totalEvents, " +
           "COUNT(p.id) as distinctTemplates, " +
           "COALESCE(SUM(LENGTH(p.template)), 0) as templateBytes " +
           "FROM LogPattern p WHERE p.organization.id = :orgId")
    PatternAggregateStats getAggregateStats(@Param("orgId") Long orgId);

    interface PatternAggregateStats {
        Long getTotalEvents();
        Long getDistinctTemplates();
        Long getTemplateBytes();
    }

    java.util.List<LogPattern> findTop5ByOrganizationIdOrderByOccurrenceCountDesc(Long organizationId);
}
