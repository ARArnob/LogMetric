package org.example.logmetricapi.service;

import org.example.logmetricapi.model.InviteToken;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.InviteTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class InviteService {

    private static final int EXPIRY_DAYS = 7;

    private final InviteTokenRepository inviteTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public InviteService(InviteTokenRepository inviteTokenRepository) {
        this.inviteTokenRepository = inviteTokenRepository;
    }

    public InviteToken createInvite(Organization organization) {
        InviteToken invite = new InviteToken();
        invite.setOrganization(organization);
        invite.setCode(generateCode());
        invite.setCreatedAt(Timestamp.from(Instant.now()));
        invite.setExpiresAt(Timestamp.from(Instant.now().plus(EXPIRY_DAYS, ChronoUnit.DAYS)));
        invite.setUsed(false);
        return inviteTokenRepository.save(invite);
    }

    /**
     * Validates and consumes a single-use invite code, returning the
     * organization it grants access to. Throws 400 for any invalid,
     * already-used, or expired code -- never reveals which case it was,
     * to avoid leaking whether a code once existed.
     */
    public Organization redeem(String code) {
        InviteToken invite = inviteTokenRepository.findByCode(code)
                .filter(i -> !i.isUsed())
                .filter(i -> i.getExpiresAt().toInstant().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired invite code"));

        invite.setUsed(true);
        inviteTokenRepository.save(invite);

        return invite.getOrganization();
    }

    private String generateCode() {
        byte[] bytes = new byte[9];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
