package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, Long> {

    @Query("SELECT d FROM Deployment d WHERE d.organization.id = :orgId AND " +
           "(cast(:fromDate as timestamp) IS NULL OR d.deployedAt >= :fromDate) AND " +
           "(cast(:toDate as timestamp) IS NULL OR d.deployedAt <= :toDate) " +
           "ORDER BY d.deployedAt DESC")
    List<Deployment> findByOrganizationIdAndDateRange(
            @Param("orgId") Long orgId,
            @Param("fromDate") Timestamp fromDate,
            @Param("toDate") Timestamp toDate);

    Deployment findFirstByOrganizationIdAndDeployedAtGreaterThanOrderByDeployedAtAsc(Long organizationId, Timestamp deployedAt);
}
