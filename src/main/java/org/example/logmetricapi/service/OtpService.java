package org.example.logmetricapi.service;

import org.example.logmetricapi.model.OtpPurpose;
import org.example.logmetricapi.model.OtpToken;
import org.example.logmetricapi.repository.OtpTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Shared one-time-code infrastructure for email verification and password
 * reset (PLAN.md T37/T38 6b). A 10^6 keyspace is trivially brute-forced
 * offline from a stolen hash -- the real defenses here are the short expiry
 * and the attempt cap, not the hash. Hashing (reusing the app's own BCrypt
 * PasswordEncoder, which gives a constant-time comparison for free via
 * matches()) just means a DB dump doesn't hand over live codes in plaintext.
 */
@Service
public class OtpService {

    private static final int CODE_DIGITS = 6;
    private static final int EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final OtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(OtpTokenRepository otpTokenRepository, PasswordEncoder passwordEncoder) {
        this.otpTokenRepository = otpTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Generates and stores a new code for (email, purpose), enforcing the
     * resend cooldown against the most recently issued code regardless of
     * whether it was ever consumed. Returns the raw code so the caller can
     * email it -- it is never persisted or logged in plaintext.
     */
    public String issue(String email, OtpPurpose purpose) {
        otpTokenRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .filter(t -> t.getCreatedAt().toInstant().isAfter(Instant.now().minusSeconds(RESEND_COOLDOWN_SECONDS)))
                .ifPresent(t -> {
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another code");
                });

        String code = generateCode();

        OtpToken token = new OtpToken();
        token.setEmail(email);
        token.setPurpose(purpose);
        token.setCodeHash(passwordEncoder.encode(code));
        token.setCreatedAt(Timestamp.from(Instant.now()));
        token.setExpiresAt(Timestamp.from(Instant.now().plus(EXPIRY_MINUTES, ChronoUnit.MINUTES)));
        token.setConsumed(false);
        token.setAttempts(0);
        otpTokenRepository.save(token);

        return code;
    }

    /**
     * Validates and consumes the most recent code issued for (email, purpose).
     * Every failure path (no code, wrong purpose, expired, already consumed,
     * wrong digits) throws the same 400 with the same message, so a caller
     * can never distinguish "no such code" from "wrong code" from "expired".
     * A code is burned on success *and* on exhausting its attempt cap, so a
     * burned code can never be retried even if the real one is guessed later.
     */
    public void verify(String email, OtpPurpose purpose, String code) {
        ResponseStatusException invalid = new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code");

        OtpToken token = otpTokenRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .filter(t -> !t.isConsumed())
                .filter(t -> t.getExpiresAt().toInstant().isAfter(Instant.now()))
                .orElseThrow(() -> invalid);

        if (token.getAttempts() >= MAX_ATTEMPTS) {
            token.setConsumed(true);
            otpTokenRepository.save(token);
            throw invalid;
        }

        if (!passwordEncoder.matches(code, token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            if (token.getAttempts() >= MAX_ATTEMPTS) {
                token.setConsumed(true);
            }
            otpTokenRepository.save(token);
            throw invalid;
        }

        token.setConsumed(true);
        otpTokenRepository.save(token);
    }

    private String generateCode() {
        int value = secureRandom.nextInt(1_000_000);
        return String.format("%0" + CODE_DIGITS + "d", value);
    }
}
