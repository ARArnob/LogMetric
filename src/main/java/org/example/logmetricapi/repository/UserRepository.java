package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByOrganizationId(Long organizationId);

    Optional<User> findByIdAndOrganizationId(Long id, Long organizationId);

    long countByOrganizationIdAndRole(Long organizationId, Role role);
}