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
    void parseReplacesEveryDigitRunWithNumPlaceholder() {
        var parsed = service.parse("User 42 logged in from session 918273 at port 8080");
        assertThat(parsed.template()).isEqualTo("User {NUM} logged in from session {NUM} at port {NUM}");
        assertThat(parsed.parameters()).containsExactly("42", "918273", "8080");
    }

    @Test
    void parseLeavesNonVariableTextUntouched() {
        var parsed = service.parse("No variables here at all");
        assertThat(parsed.template()).isEqualTo("No variables here at all");
        assertThat(parsed.parameters()).isEmpty();
    }

    @Test
    void messagesDifferingOnlyByUUIDProduceSameTemplateAndHash() {
        String a = service.cleanser("Request 123e4567-e89b-12d3-a456-426614174000 failed");
        String b = service.cleanser("Request 987fcdeb-51a2-43d7-9012-345678901234 failed");

        assertThat(a).isEqualTo("Request {UUID} failed");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }
    
    @Test
    void messagesDifferingOnlyByEmailProduceSameTemplateAndHash() {
        String a = service.cleanser("User admin@example.com logged out");
        String b = service.cleanser("User test.user@foo.co.uk logged out");

        assertThat(a).isEqualTo("User {EMAIL} logged out");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void messagesDifferingOnlyByIpProduceSameTemplateAndHash() {
        String a = service.cleanser("Connection from 192.168.1.1 refused");
        String b = service.cleanser("Connection from 10.0.0.2 refused");

        assertThat(a).isEqualTo("Connection from {IP} refused");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void messagesDifferingOnlyByHexTokenProduceSameTemplateAndHash() {
        String a = service.cleanser("Invalid token a1b2c3d4e5f6a7b8c9d0 not found"); 
        String b = service.cleanser("Invalid token 0123456789abcdef0123 not found");

        assertThat(a).isEqualTo("Invalid token {HEX} not found");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void messagesDifferingOnlyByQuotedStringProduceSameTemplateAndHash() {
        String a = service.cleanser("Error: \"File not found\" on disk");
        String b = service.cleanser("Error: \"Access denied\" on disk");

        assertThat(a).isEqualTo("Error: {STR} on disk");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void messagesDifferingOnlyByIntegerOrDecimalProduceSameTemplateAndHash() {
        String a = service.cleanser("Latency 45.67 ms exceeded 100 threshold");
        String b = service.cleanser("Latency 12.3 ms exceeded 50 threshold");

        assertThat(a).isEqualTo("Latency {NUM} ms exceeded {NUM} threshold");
        assertThat(a).isEqualTo(b);
        assertThat(service.generateHash(a)).isEqualTo(service.generateHash(b));
    }

    @Test
    void mixedTypesAreMaskedAndParametersReturnedInOrder() {
        var parsed = service.parse("User admin@foo.com from 127.0.0.1 used token 0123456789abcdef0123 to read \"secret.txt\"");
        assertThat(parsed.template()).isEqualTo("User {EMAIL} from {IP} used token {HEX} to read {STR}");
        assertThat(parsed.parameters()).containsExactly("admin@foo.com", "127.0.0.1", "0123456789abcdef0123", "\"secret.txt\"");
    }

    @Test
    void uuidIsNotShreddedIntoHexOrNumFragments() {
        var parsed = service.parse("ID 123e4567-e89b-12d3-a456-426614174000 processed");
        assertThat(parsed.template()).isEqualTo("ID {UUID} processed");
        assertThat(parsed.parameters()).containsExactly("123e4567-e89b-12d3-a456-426614174000");
    }
    
    @Test
    void hashIsStableAcrossRepeatedCalls() {
        String cleansed = service.cleanser("Order {NUM} confirmed");
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
