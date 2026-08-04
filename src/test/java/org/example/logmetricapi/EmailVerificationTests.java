package org.example.logmetricapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.OtpPurpose;
import org.example.logmetricapi.model.OtpToken;
import org.example.logmetricapi.repository.OtpTokenRepository;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T37 (PLAN.md): the signup OTP flow -- login stays blocked until the
 * emailed code is confirmed, wrong/expired/exhausted codes are rejected
 * without revealing which case it was, resend can't be used to tell a real
 * pending signup apart from a nonexistent address, and an invited teammate
 * goes through exactly the same verification as a brand-new org's admin.
 *
 * Same infra requirement as TenantIsolationAndRbacTests: needs
 * `docker compose up -d` (Postgres + Elasticsearch) running first. Mail is
 * captured in-memory via FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class EmailVerificationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OtpTokenRepository otpTokenRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void loginIsBlockedUntilTheEmailedCodeIsConfirmed() throws Exception {
        String email = register();

        loginAttempt(email).andExpect(status().isForbidden());
        verify(email, latestCode(email)).andExpect(status().isOk());
        loginAttempt(email).andExpect(status().isOk());
    }

    @Test
    void wrongCodeIsRejectedWithoutRevealingTheRealOne() throws Exception {
        String email = register();

        verify(email, wrongCode(latestCode(email))).andExpect(status().isBadRequest());
        loginAttempt(email).andExpect(status().isForbidden());
    }

    @Test
    void fiveWrongAttemptsBurnTheCodeEvenForTheCorrectDigits() throws Exception {
        String email = register();
        String correctCode = latestCode(email);
        String wrong = wrongCode(correctCode);

        for (int i = 0; i < 5; i++) {
            verify(email, wrong).andExpect(status().isBadRequest());
        }

        // Attempt cap reached -- the code is burned, so even the real digits
        // must no longer work. Forces a resend instead of an endless retry.
        verify(email, correctCode).andExpect(status().isBadRequest());
    }

    @Test
    void expiredCodeIsRejected() throws Exception {
        String email = register();
        String code = latestCode(email);

        OtpToken token = otpTokenRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, OtpPurpose.EMAIL_VERIFICATION)
                .orElseThrow();
        token.setExpiresAt(Timestamp.from(Instant.now().minus(1, ChronoUnit.MINUTES)));
        otpTokenRepository.save(token);

        verify(email, code).andExpect(status().isBadRequest());
    }

    @Test
    void resendReturnsTheSameGenericResponseWhetherOrNotTheAccountExists() throws Exception {
        String realPendingEmail = register();
        String nonexistentEmail = "t37-nobody-" + UUID.randomUUID() + "@test.local";

        MvcResult realResult = resend(realPendingEmail).andExpect(status().isOk()).andReturn();
        MvcResult fakeResult = resend(nonexistentEmail).andExpect(status().isOk()).andReturn();

        assertThat(realResult.getResponse().getContentAsString())
                .isEqualTo(fakeResult.getResponse().getContentAsString());
    }

    @Test
    void invitedTeammateGoesThroughTheSameVerificationAsANewOrgAdmin() throws Exception {
        String adminEmail = register();
        String adminToken = verifyAndExtractToken(adminEmail);

        MvcResult inviteResult = mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        String inviteCode = objectMapper.readTree(inviteResult.getResponse().getContentAsString()).get("code").asText();

        String memberEmail = "t37-member-" + UUID.randomUUID() + "@test.local";
        MvcResult joinResult = mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", memberEmail, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(joinResult.getResponse().getContentAsString())
                .as("register-with-invite must not hand back a usable token before verification")
                .doesNotContain("\"token\"");

        loginAttempt(memberEmail).andExpect(status().isForbidden());
        verify(memberEmail, latestCode(memberEmail)).andExpect(status().isOk());
        loginAttempt(memberEmail).andExpect(status().isOk());
    }

    // ===== helpers =====

    private String register() throws Exception {
        String email = "t37-user-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T37-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());
        return email;
    }

    private String verifyAndExtractToken(String email) throws Exception {
        MvcResult result = verify(email, latestCode(email)).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String latestCode(String email) {
        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).as("expected a verification code to have been emailed to " + email).isNotNull();
        return code;
    }

    private String wrongCode(String correctCode) {
        char first = correctCode.charAt(0);
        char replacement = first == '9' ? '0' : (char) (first + 1);
        return replacement + correctCode.substring(1);
    }

    private ResultActions verify(String email, String code) throws Exception {
        return mockMvc.perform(post("/api/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))));
    }

    private ResultActions resend(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email))));
    }

    private ResultActions loginAttempt(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", "Password123"))));
    }
}
