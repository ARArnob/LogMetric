package org.example.logmetricapi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Provides the password hashing strategy for the entire application.
 * BCrypt is used because it's a slow, salted hashing algorithm purpose-built
 * for passwords — unlike SHA-256/MD5, it resists brute-force and rainbow-table attacks.
 */
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}