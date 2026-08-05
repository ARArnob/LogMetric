package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.PatternParamWindow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public interface PatternParamWindowRepository extends JpaRepository<PatternParamWindow, Long> {

    List<PatternParamWindow> findByOrganizationIdAndWindowStartGreaterThanEqualOrderByWindowStartDesc(Long organizationId, Timestamp windowStart);
}
