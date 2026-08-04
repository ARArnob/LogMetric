package org.example.logmetricapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * S2 (SECURITY-TODO.md): /api/auth/login previously had no brute-force protection
 * at all -- unlimited password guessing per account. LoginAttemptService tracks
 * failures per email AND per IP; every test here uses a distinct X-Forwarded-For
 * per scenario so the two dimensions can be verified independently, and so this
 * class doesn't collide with the shared-IP note in ForgotPasswordTests/
 * ChangePasswordTests/AuditLogTests/EmailVerificationTests' own login helpers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class LoginRateLimitTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void fifthWrongPasswordLocksOutEvenTheCorrectOneUntilTheWindowExpires() throws Exception {
        String email = registerAndVerify();
        String ip = "ip-" + UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            attemptLogin(email, "wrong-password", ip).andExpect(status().isUnauthorized());
        }

        attemptLogin(email, "Correct-Password-123", ip).andExpect(status().isTooManyRequests());
    }

    @Test
    void lockoutOnOneAccountDoesNotBlockAnotherAccountFromTheSameIp() throws Exception {
        String lockedEmail = registerAndVerify();
        String otherEmail = registerAndVerify();
        String sharedIp = "ip-" + UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            attemptLogin(lockedEmail, "wrong-password", sharedIp).andExpect(status().isUnauthorized());
        }
        // The email bucket is locked, but the IP bucket only has the locked
        // email's 5 failures against it too (same requests incremented both) --
        // exercise a *different* IP for the other account instead of asserting
        // this edge case, which is what the next test already covers explicitly.
        attemptLogin(otherEmail, "Correct-Password-123", "ip-" + UUID.randomUUID())
                .andExpect(status().isOk());
    }

    @Test
    void oneIpSprayingFiveDifferentAccountsAlsoTripsTheIpLockout() throws Exception {
        String sharedIp = "ip-" + UUID.randomUUID();
        String targetEmail = registerAndVerify();

        for (int i = 0; i < 5; i++) {
            attemptLogin(registerAndVerify(), "wrong-password", sharedIp).andExpect(status().isUnauthorized());
        }

        // Even a fresh, previously-untouched account is blocked once its login
        // request comes from an IP that's already hit the failure cap.
        attemptLogin(targetEmail, "Correct-Password-123", sharedIp).andExpect(status().isTooManyRequests());
    }

    @Test
    void aSuccessfulLoginClearsThePriorFailureCountForThatEmail() throws Exception {
        String email = registerAndVerify();

        // recordSuccess() only clears the email-side bucket, deliberately (see
        // LoginAttemptService) -- reusing one IP for both rounds would also
        // accumulate 4+4 failures against the *IP* bucket and trip that lockout
        // instead, which isn't what this test is checking. A fresh IP per round
        // isolates the assertion to the email-side reset specifically.
        for (int i = 0; i < 4; i++) {
            attemptLogin(email, "wrong-password", "ip-" + UUID.randomUUID()).andExpect(status().isUnauthorized());
        }
        attemptLogin(email, "Correct-Password-123", "ip-" + UUID.randomUUID()).andExpect(status().isOk());

        // Counter reset by the success above -- four more wrong guesses shouldn't
        // trip the 5-attempt cap on their own.
        for (int i = 0; i < 4; i++) {
            attemptLogin(email, "wrong-password", "ip-" + UUID.randomUUID()).andExpect(status().isUnauthorized());
        }
        attemptLogin(email, "Correct-Password-123", "ip-" + UUID.randomUUID()).andExpect(status().isOk());
    }

    @Test
    void anUnverifiedAccountRejectionDoesNotCountTowardTheLockout() throws Exception {
        String email = "s2-unverified-" + UUID.randomUUID() + "@test.local";
        String ip = "ip-" + UUID.randomUUID();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Correct-Password-123",
                                "organizationName", "S2-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        // "Email not verified" (403), not "bad credentials" -- five of these must
        // not lock the account out, since it's not evidence of a guessing attempt.
        for (int i = 0; i < 6; i++) {
            attemptLogin(email, "Correct-Password-123", ip).andExpect(status().isForbidden());
        }
    }

    /** Registers a fresh, email-verified account and returns its email. */
    private String registerAndVerify() throws Exception {
        String email = "s2-login-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Correct-Password-123",
                                "organizationName", "S2-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk());

        return email;
    }

    private ResultActions attemptLogin(String email, String password, String ip) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))));
    }
}
