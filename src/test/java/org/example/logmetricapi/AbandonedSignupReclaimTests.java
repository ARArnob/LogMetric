package org.example.logmetricapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.OtpPurpose;
import org.example.logmetricapi.model.OtpToken;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.OtpTokenRepository;
import org.example.logmetricapi.repository.SystemRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A signup that never confirms its OTP must not permanently squat an email
 * address or organization name -- see AuthController.reclaimIfAbandoned /
 * reclaimOrganizationIfAbandoned. Within the grace period it's still a
 * normal conflict (might be the real owner mid-verification); past it, a
 * fresh registration is free to reclaim both.
 *
 * Same infra requirement as the other integration tests here: needs
 * `docker compose up -d` running first. Mail is captured in-memory via
 * FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class AbandonedSignupReclaimTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private OtpTokenRepository otpTokenRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void unverifiedSignupStillWithinGracePeriodBlocksBothEmailAndOrgNameReuse() throws Exception {
        String email = "reclaim-" + UUID.randomUUID() + "@test.local";
        String orgName = "Reclaim-Org-" + UUID.randomUUID();
        register(email, orgName).andExpect(status().isOk());

        register(email, "Different-Org-" + UUID.randomUUID())
                .andExpect(status().isConflict());
        register("different-" + UUID.randomUUID() + "@test.local", orgName)
                .andExpect(status().isConflict());
    }

    @Test
    void abandonedSignupPastGracePeriodFreesTheEmailAndOrgName() throws Exception {
        String email = "reclaim-" + UUID.randomUUID() + "@test.local";
        String orgName = "Reclaim-Org-" + UUID.randomUUID();
        register(email, orgName).andExpect(status().isOk());
        backdateSignup(email);

        register(email, orgName).andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).as("the reclaimed signup should get its own fresh OTP").isNotNull();
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk());

        Organization org = organizationRepository.findByName(orgName).orElseThrow();
        assertThat(userRepository.findByOrganizationId(org.getId())).hasSize(1);
        assertThat(systemRepository.findByOrganizationId(org.getId())).hasSize(1);
    }

    @Test
    void verifiedAccountIsNeverReclaimedNoMatterHow() throws Exception {
        String email = "reclaim-" + UUID.randomUUID() + "@test.local";
        String orgName = "Reclaim-Org-" + UUID.randomUUID();
        register(email, orgName).andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk());
        backdateSignup(email);

        register(email, "Different-Org-" + UUID.randomUUID()).andExpect(status().isConflict());
        register("different-" + UUID.randomUUID() + "@test.local", orgName).andExpect(status().isConflict());
    }

    // ===== helpers =====

    private ResultActions register(String email, String orgName) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", email, "password", "Password123", "organizationName", orgName))));
    }

    private void backdateSignup(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setCreatedAt(Timestamp.from(Instant.now().minus(2, ChronoUnit.HOURS)));
        userRepository.save(user);

        // Also backdate the still-live EMAIL_VERIFICATION token -- otherwise
        // OtpService's own 60s resend cooldown (independent of this test's
        // grace period) rejects the reclaimed registration's fresh code
        // request with 429, since it was "just" issued moments ago in
        // wall-clock test time.
        OtpToken token = otpTokenRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, OtpPurpose.EMAIL_VERIFICATION)
                .orElseThrow();
        token.setCreatedAt(Timestamp.from(Instant.now().minus(2, ChronoUnit.HOURS)));
        otpTokenRepository.save(token);
    }
}
