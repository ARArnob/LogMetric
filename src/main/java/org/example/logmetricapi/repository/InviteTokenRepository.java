package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.InviteToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InviteTokenRepository extends JpaRepository<InviteToken, Long> {
    Optional<InviteToken> findByCode(String code);

    List<InviteToken> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    Optional<InviteToken> findByIdAndOrganizationId(Long id, Long organizationId);
}
