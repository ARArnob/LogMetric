package org.example.logmetricapi;

import org.example.logmetricapi.service.PatternRecognitionService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T25 (PLAN.md): cleanser + hash stability. PatternRecognitionService has no
 * dependencies, so this runs without a Spring context or docker compose.
 */
class PatternRecognitionServiceTests {

    private final PatternRecognitionService service = new PatternRecognitionService();

    @Test
    void cleanserReplacesEveryDigitRunWithAPlaceholder() {
        String cleansed = service.cleanser("User 42 logged in from session 918273 at port 8080");
        assertThat(cleansed).isEqualTo("User {Number} logged in from session {Number} at port {Number}");
    }

    @Test
    void cleanserLeavesNonDigitTextUntouched() {
        assertThat(service.cleanser("No digits here at all")).isEqualTo("No digits here at all");
    }

    @Test
    void messagesDifferingOnlyByEmbeddedIdsHashTheSame() {
        String a = service.cleanser("Request 12345 failed for user 999");
        String b = service.cleanser("Request 67890 failed for user 111");

        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void hashIsStableAcrossRepeatedCalls() {
        String cleansed = service.cleanser("Order {Number} confirmed");
        assertThat(service.generateHash(cleansed)).isEqualTo(service.generateHash(cleansed));
    }

    @Test
    void hashIsA64CharacterHexSha256Digest() {
        String hash = service.generateHash("hello");
        assertThat(hash).hasSize(64).matches("[0-9a-f]{64}");
    }

    @Test
    void differentTemplatesHashDifferently() {
        String hashA = service.generateHash(service.cleanser("Order 1 shipped"));
        String hashB = service.generateHash(service.cleanser("Payment declined"));
        assertThat(hashA).isNotEqualTo(hashB);
    }
}
