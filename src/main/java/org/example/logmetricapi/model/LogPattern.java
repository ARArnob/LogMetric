package org.example.logmetricapi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.sql.Timestamp;

@Entity
@Table(name = "log_patterns",
       uniqueConstraints = @UniqueConstraint(
           name = "uk_log_patterns_org_hash",
           columnNames = {"organization_id", "pattern_hash"}))
public class LogPattern {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "pattern_hash", nullable = false, length = 64)
    private String patternHash;

    @Column(nullable = false, length = 2000)
    private String template;

    /** One real message that produced this template -- for display only. */
    @Column(name = "sample_message", length = 2000)
    private String sampleMessage;

    @Column(name = "first_seen", nullable = false)
    private Timestamp firstSeen;

    @Column(name = "last_seen", nullable = false)
    private Timestamp lastSeen;

    @Column(name = "occurrence_count", nullable = false)
    private long occurrenceCount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public String getPatternHash() { return patternHash; }
    public void setPatternHash(String patternHash) { this.patternHash = patternHash; }

    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public String getSampleMessage() { return sampleMessage; }
    public void setSampleMessage(String sampleMessage) { this.sampleMessage = sampleMessage; }

    public Timestamp getFirstSeen() { return firstSeen; }
    public void setFirstSeen(Timestamp firstSeen) { this.firstSeen = firstSeen; }

    public Timestamp getLastSeen() { return lastSeen; }
    public void setLastSeen(Timestamp lastSeen) { this.lastSeen = lastSeen; }

    public long getOccurrenceCount() { return occurrenceCount; }
    public void setOccurrenceCount(long occurrenceCount) { this.occurrenceCount = occurrenceCount; }
}
