package org.example.logmetricapi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.sql.Timestamp;

@Entity
@Table(
    name = "pattern_param_windows",
    indexes = {
        @Index(name = "idx_param_window_lookup", columnList = "organization_id, pattern_hash, param_index, window_start")
    }
)
public class PatternParamWindow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "pattern_hash", nullable = false)
    private String patternHash;

    @Column(name = "param_index", nullable = false)
    private int paramIndex;

    @Column(name = "window_start", nullable = false)
    private Timestamp windowStart;

    @Column(name = "window_end", nullable = false)
    private Timestamp windowEnd;

    @Column(name = "distinct_count", nullable = false)
    private int distinctCount;

    @Column(name = "total_count", nullable = false)
    private long totalCount;

    public PatternParamWindow() {}

    public PatternParamWindow(Organization organization, String patternHash, int paramIndex, Timestamp windowStart, Timestamp windowEnd, int distinctCount, long totalCount) {
        this.organization = organization;
        this.patternHash = patternHash;
        this.paramIndex = paramIndex;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.distinctCount = distinctCount;
        this.totalCount = totalCount;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public String getPatternHash() {
        return patternHash;
    }

    public void setPatternHash(String patternHash) {
        this.patternHash = patternHash;
    }

    public int getParamIndex() {
        return paramIndex;
    }

    public void setParamIndex(int paramIndex) {
        this.paramIndex = paramIndex;
    }

    public Timestamp getWindowStart() {
        return windowStart;
    }

    public void setWindowStart(Timestamp windowStart) {
        this.windowStart = windowStart;
    }

    public Timestamp getWindowEnd() {
        return windowEnd;
    }

    public void setWindowEnd(Timestamp windowEnd) {
        this.windowEnd = windowEnd;
    }

    public int getDistinctCount() {
        return distinctCount;
    }

    public void setDistinctCount(int distinctCount) {
        this.distinctCount = distinctCount;
    }

    public long getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(long totalCount) {
        this.totalCount = totalCount;
    }
}
