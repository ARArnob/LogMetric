package org.example.logmetricapi.service;

import org.example.logmetricapi.model.ClientApplication;
import org.example.logmetricapi.repository.ClientApplicationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

@Service
public class DatabaseSeeder implements CommandLineRunner {
    private final ClientApplicationRepository repository;
    public DatabaseSeeder(ClientApplicationRepository repository) {
        this.repository = repository;
    }
    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            ClientApplication client = new ClientApplication("payment-service", java.util.UUID.randomUUID().toString());
            System.out.println(">>> SEEDED API KEY: " + client.getApiKey());
            repository.save(client);
        }
    }
}
