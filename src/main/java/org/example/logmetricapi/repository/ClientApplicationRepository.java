package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.ClientApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClientApplicationRepository extends JpaRepository<ClientApplication,Long> {
    public Optional<ClientApplication> findByApiKey(String apiKey);
}
