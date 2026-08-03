package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.ServiceAlias;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceAliasRepository extends JpaRepository<ServiceAlias, Long> {
    List<ServiceAlias> findByOrganizationId(Long organizationId);

    Optional<ServiceAlias> findByOrganizationIdAndRawServiceName(Long organizationId, String rawServiceName);

    void deleteByOrganizationIdAndRawServiceName(Long organizationId, String rawServiceName);
}
