package org.example.logmetricapi.service;

import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;

@Service
@Profile("!prod")
public class DatabaseSeeder implements CommandLineRunner {
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ApiKeyService apiKeyService;
    private final PasswordEncoder passwordEncoder;

    @Value("${SEED_ADMIN_PASSWORD:admin12345}")
    private String seedAdminPassword;

    public DatabaseSeeder(OrganizationRepository organizationRepository,
                           UserRepository userRepository,
                           ApiKeyService apiKeyService,
                           PasswordEncoder passwordEncoder) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.apiKeyService = apiKeyService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (organizationRepository.count() == 0) {
            Organization org = new Organization();
            org.setName("Default Organization");
            org.setCreatedAt(Timestamp.from(Instant.now()));
            org = organizationRepository.save(org);

            User admin = new User();
            admin.setEmail("admin@logmetric.local");
            admin.setPassword(passwordEncoder.encode(seedAdminPassword));
            admin.setRole(Role.ADMIN);
            admin.setOrganization(org);
            // Seeded for local dev convenience -- skip the OTP round-trip so the
            // printed credentials below are immediately usable (T37).
            admin.setEmailVerified(true);
            userRepository.save(admin);

            String apiKey = apiKeyService.generateKey(org);

            System.out.println(">>> SEEDED ADMIN LOGIN: admin@logmetric.local / " + seedAdminPassword);
            System.out.println(">>> SEEDED API KEY: " + apiKey);
        }
    }
}
