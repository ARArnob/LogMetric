package org.example.logmetricapi;

import io.jsonwebtoken.ExpiredJwtException;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * T25 (PLAN.md): JwtService round-trip -- generate, parse, extract claims,
 * and reject an expired token. JwtService has no dependencies beyond its two
 * @Value fields, set directly here via ReflectionTestUtils, so this runs
 * without a Spring context or docker compose, unlike every other test class
 * in this project.
 */
class JwtServiceTests {

    private static final String TEST_SECRET = "test-secret-key-at-least-32-bytes-long-for-hs256";

    private JwtService newJwtService(long expirationMillis) {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", expirationMillis);
        return jwtService;
    }

    private User testUser() {
        Organization org = new Organization();
        org.setId(42L);
        org.setName("Test Org");
        return new User(7L, "jwt-test@test.local", "hashed", Role.ADMIN, org);
    }

    @Test
    void generatedTokenRoundTripsEmailOrganizationAndRole() {
        JwtService jwtService = newJwtService(3_600_000L);
        User user = testUser();

        String token = jwtService.generateToken(user);

        assertThat(jwtService.extractEmail(token)).isEqualTo("jwt-test@test.local");
        assertThat(jwtService.extractOrganizationId(token)).isEqualTo("42");
        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    void tokenIssuedForOneUserIsNotValidForAnother() {
        JwtService jwtService = newJwtService(3_600_000L);
        User user = testUser();
        User otherUser = new User(9L, "someone-else@test.local", "hashed", Role.USER, user.getOrganization());

        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void expiredTokenIsRejected() {
        // Negative expiration -- the token is already expired the instant it's issued.
        JwtService jwtService = newJwtService(-1000L);
        User user = testUser();

        String token = jwtService.generateToken(user);

        // The underlying jjwt parser throws on an expired token rather than
        // returning a boolean -- JwtAuthFilter (T28) already catches
        // JwtException broadly for exactly this reason. This pins that
        // behavior down rather than papering over it with a try/catch here.
        assertThatThrownBy(() -> jwtService.isTokenValid(token, user))
                .isInstanceOf(ExpiredJwtException.class);
    }

    // S1 (SECURITY-TODO.md): the app must refuse to boot with the placeholder secret
    // that ships in application.properties -- it's public (the repo is public), so
    // leaving it in place lets anyone forge an admin token for any organization.

    @Test
    void validateSecretRejectsTheKnownPlaceholderFromApplicationProperties() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey",
                "thisIsADefaultSecretKeyThatIsAtLeast32BytesLongForHS256");

        assertThatThrownBy(jwtService::validateSecret)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void validateSecretRejectsATooShortSecret() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", "way-too-short");

        assertThatThrownBy(jwtService::validateSecret)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void validateSecretAcceptsARealRandomSecret() {
        JwtService jwtService = newJwtService(3_600_000L);

        assertThatCode(jwtService::validateSecret).doesNotThrowAnyException();
    }
}
