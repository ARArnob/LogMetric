package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.OtpPurpose;
import org.example.logmetricapi.model.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, OtpPurpose purpose);
}
