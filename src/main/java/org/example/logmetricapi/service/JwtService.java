package org.example.logmetricapi.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.example.logmetricapi.model.User; // Imported custom User model
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // HS256 requires a >=256-bit key

    // The fallback application.properties ships for local dev when JWT_SECRET isn't set.
    // It's 55 bytes, so it passes the length check on its own -- must be rejected by
    // exact match too, or anyone who reads the (public) repo can forge an admin token.
    private static final String KNOWN_DEFAULT_SECRET = "thisIsADefaultSecretKeyThatIsAtLeast32BytesLongForHS256";

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    /**
     * Fails fast at startup rather than at first login if JWT_SECRET is missing, too
     * short for HS256 (plain UTF-8 string, not Base64, per getSignInKey()), or left at
     * the well-known placeholder value that ships in application.properties.
     */
    @PostConstruct
    public void validateSecret() {
        if (secretKey == null || secretKey.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "jwt.secret must be at least " + MIN_SECRET_BYTES + " bytes long for HS256. " +
                            "Set the JWT_SECRET environment variable to a strong random value.");
        }
        if (secretKey.equals(KNOWN_DEFAULT_SECRET)) {
            throw new IllegalStateException(
                    "JWT_SECRET is set to the placeholder value from application.properties. " +
                            "That value is public (it's in the repo), so anyone can forge an admin token " +
                            "for any organization with it. Set JWT_SECRET to a real random value, e.g. " +
                            "`export JWT_SECRET=$(openssl rand -hex 32)`.");
        }
    }

    /**
     * Extracts the email (stored as the JWT subject) from a token.
     */
    public String extractEmail(String token) {
        return extractClaim(token, claims -> claims.getSubject());
    }

    // Kept for backward compatibility with your existing code
    public String extractUsername(String token) {
        return extractEmail(token);
    }

    // Phase 3 requirement: Extract Organization ID
    public String extractOrganizationId(String token) {
        return extractClaim(token, claims -> claims.get("organizationId", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Phase 3 requirement: Generates a signed JWT embedding organizationId and role.
     */
    public String generateToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();

        if (user.getOrganization() != null) {
            extraClaims.put("organizationId", user.getOrganization().getId().toString());
        }
        if (user.getRole() != null) {
            extraClaims.put("role", user.getRole().name());
        }

        return buildToken(extraClaims, user, jwtExpiration);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    /**
     * Checks that the token belongs to this user AND has not expired.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, claims -> claims.getExpiration());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}