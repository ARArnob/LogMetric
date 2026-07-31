package org.example.logmetricapi.service;

import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;

@Service
public class DatabaseSeeder implements CommandLineRunner {
    private final OrganizationRepository organizationRepository;
    private final ApiKeyService apiKeyService;

    public DatabaseSeeder(OrganizationRepository organizationRepository, ApiKeyService apiKeyService) {
        this.organizationRepository = organizationRepository;
        this.apiKeyService = apiKeyService;
    }

    @Override
    public void run(String... args) throws Exception {
        if (organizationRepository.count() == 0) {
            Organization org = new Organization();
            org.setName("Default Organization");
            org.setCreatedAt(Timestamp.from(Instant.now()));
            organizationRepository.save(org);

            String apiKey = apiKeyService.generateKey(org);
            System.out.println(">>> SEEDED API KEY: " + apiKey);
        }
    }
}

