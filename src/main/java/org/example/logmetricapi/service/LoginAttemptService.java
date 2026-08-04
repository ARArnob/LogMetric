package org.example.logmetricapi.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * S2 (SECURITY-TODO.md): /api/auth/login had no brute-force protection at all --
 * unlimited password guessing per account. Tracks failed attempts per email AND
 * per IP independently, so either a distributed attack against one account or one
 * IP spraying many accounts trips a lockout.
 *
 * In-memory rather than a new table -- same tradeoff already made for
 * AlertDeliveryService's cooldown state (T22, see SECURITY-TODO.md S6): this is a
 * single-instance deployment, and a restart clearing the counters is a far smaller
 * risk than the brute-force window a DB round-trip on every login attempt would
 * cost, or the migration overhead of a new table under ddl-auto=update (S5).
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private static final class Bucket {
        final AtomicInteger failures = new AtomicInteger(0);
        volatile Instant lockedUntil = null;
    }

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /** Throws 429 if this email or this IP is currently locked out. */
    public void assertNotLocked(String email, String ip) {
        assertKeyNotLocked("email:" + normalize(email));
        assertKeyNotLocked("ip:" + ip);
    }

    /** Call after a failed password check -- not for "account disabled" rejections. */
    public void recordFailure(String email, String ip) {
        recordFailureForKey("email:" + normalize(email));
        recordFailureForKey("ip:" + ip);
    }

    /** Clears the email-side counter on a successful login. The IP-side counter is
     *  left to expire on its own -- clearing it on any successful login would let an
     *  attacker interleave one known-good login to reset the counter for other
     *  accounts sprayed from the same address. */
    public void recordSuccess(String email) {
        buckets.remove("email:" + normalize(email));
    }

    private void assertKeyNotLocked(String key) {
        Bucket bucket = buckets.get(key);
        if (bucket == null) {
            return;
        }
        Instant lockedUntil = bucket.lockedUntil;
        if (lockedUntil == null) {
            return;
        }
        if (Instant.now().isBefore(lockedUntil)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed login attempts. Try again later.");
        }
        // Lockout expired -- drop the bucket so this key starts clean.
        buckets.remove(key, bucket);
    }

    private void recordFailureForKey(String key) {
        buckets.compute(key, (k, existing) -> {
            Bucket bucket = existing != null ? existing : new Bucket();
            if (bucket.failures.incrementAndGet() >= MAX_ATTEMPTS) {
                bucket.lockedUntil = Instant.now().plus(LOCKOUT_DURATION);
            }
            return bucket;
        });
    }

    private String normalize(String email) {
        return email == null ? "" : email.toLowerCase(Locale.ROOT);
    }
}
