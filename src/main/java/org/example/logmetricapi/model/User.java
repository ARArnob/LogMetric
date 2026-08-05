package org.example.logmetricapi.model;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.sql.Timestamp;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    // columnDefinition avoids Hibernate auto-generating a CHECK constraint
    // enumerating the exact enum values at DDL-creation time -- ddl-auto=update
    // never widens that constraint when a new Role is added later, so it
    // would otherwise reject every login the moment the enum grows.
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(40)")
    private Role role;

    // Phase 2 requirement: Relationship with Organization
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    // T37: gates login (see isEnabled()) until the signup OTP is confirmed.
    // columnDefinition spells out an explicit DEFAULT so Hibernate's ddl-auto=update
    // can ALTER TABLE this in on top of an existing, already-populated `users` table --
    // plain `nullable=false` with no default makes Postgres reject that ALTER outright
    // once any row exists (it did, the hard way, against a pre-existing local dev DB).
    // Existing rows backfill to false, i.e. "not verified yet, go through OTP" -- the
    // safe default, and one the resend-verification flow already handles for free.
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean emailVerified = false;

    // Lets a registration recheck (see AuthController.register) tell "brand
    // new signup, still inside its OTP grace period" apart from "abandoned
    // days ago" -- same ddl-auto=update-safe explicit-default pattern as
    // emailVerified above, since this table already has rows.
    @Column(nullable = false, columnDefinition = "timestamp not null default now()")
    private Timestamp createdAt = Timestamp.from(java.time.Instant.now());

    // --- Constructors ---
    public User() {
    }

    public User(Long id, String email, String password, Role role, Organization organization) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.role = role;
        this.organization = organization;
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    // --- UserDetails Methods ---
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // T37: DaoAuthenticationProvider checks this before verifying the
    // password, so an unverified account fails login with a distinct
    // DisabledException instead of a generic bad-credentials error.
    @Override
    public boolean isEnabled() {
        return emailVerified;
    }
}