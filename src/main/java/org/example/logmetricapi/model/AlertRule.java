package org.example.logmetricapi.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.sql.Timestamp;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false)
    private String name;

    // columnDefinition avoids Hibernate auto-generating a CHECK constraint
    // enumerating the exact enum values at DDL-creation time -- ddl-auto=update
    // never widens that constraint when a new metric is added later.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(40)")
    private AlertMetric metric;

    @Column(nullable = false)
    private double threshold;

    @Column(nullable = false)
    private int windowSeconds;

    // A rule notifies a distribution list, not a single address -- one admin
    // may need paging for several rules, and the same rule may need to page
    // several people. See PLAN.md T20 for why this is a Set<String> via
    // @ElementCollection (queryable, constrained) rather than a JSONB blob,
    // and EAGER (rules are few; the scheduler needs recipients on every pass).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "alert_rule_target_emails", joinColumns = @JoinColumn(name = "alert_rule_id"))
    @Column(name = "email", nullable = false)
    private Set<String> targetEmails = new HashSet<>();

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private Timestamp createdAt;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AlertMetric getMetric() {
        return metric;
    }

    public void setMetric(AlertMetric metric) {
        this.metric = metric;
    }

    public double getThreshold() {
        return threshold;
    }

    public void setThreshold(double threshold) {
        this.threshold = threshold;
    }

    public int getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(int windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    public Set<String> getTargetEmails() {
        return targetEmails;
    }

    public void setTargetEmails(Set<String> targetEmails) {
        this.targetEmails = targetEmails;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
