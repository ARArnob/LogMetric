package org.example.logmetricapi.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

@Service
public class DatabaseSeeder implements CommandLineRunner {

    public DatabaseSeeder() {
    }

    @Override
    public void run(String... args) throws Exception {
        // ClientApplication model is removed/refactored in this branch.
        // Seeding is temporarily disabled to allow successful compilation.
        System.out.println(">>> DatabaseSeeder running... (ClientApplication seeding disabled)");
    }
}