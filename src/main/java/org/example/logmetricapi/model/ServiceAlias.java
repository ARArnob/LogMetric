package org.example.logmetricapi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.sql.Timestamp;

// T43: a display-only translation layer. rawServiceName is never rewritten
// anywhere it's indexed/filtered on -- only ever looked up at render time.
@Entity
@Table(name = "service_aliases",
        uniqueConstraints = @UniqueConstraint(columnNames = {"organization_id", "raw_service_name"}))
public class ServiceAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "raw_service_name", nullable = false)
    private String rawServiceName;

    @Column(name = "display_name", nullable = false)
    private String displayName;

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

    public String getRawServiceName() {
        return rawServiceName;
    }

    public void setRawServiceName(String rawServiceName) {
        this.rawServiceName = rawServiceName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
