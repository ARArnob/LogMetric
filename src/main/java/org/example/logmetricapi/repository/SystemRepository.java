package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.SystemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SystemRepository extends JpaRepository<SystemEntity, Long> {
    List<SystemEntity> findByOrganizationId(Long organizationId);

    Optional<SystemEntity> findByIdAndOrganizationId(Long id, Long organizationId);
}
