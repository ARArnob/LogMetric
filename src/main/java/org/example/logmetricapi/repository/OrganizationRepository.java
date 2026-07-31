package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
}
