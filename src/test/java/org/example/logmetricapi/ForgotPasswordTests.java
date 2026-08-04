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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T38 (PLAN.md): forgot/reset password reuses T37's OTP infrastructure --
 * forgot-password can't be used to enumerate registered emails (stricter than
 * resend-verification, since the caller hasn't proven anything here), a
 * PASSWORD_RESET code can't satisfy verify-email or vice versa (purpose
 * scoping, enforced by OtpService itself), a weak new password is rejected,
 * and a successful reset both changes the password and marks the account
 * verified (self-service recovery for anyone left unverified).
 *
 * Same infra requirement as the other integration tests here: needs
 * `docker compose up -d` running first. Mail is captured in-memory via
 * FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class ForgotPasswordTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void resetCodeChangesThePasswordAndTheOldPasswordNoLongerWorks() throws Exception {
        String email = registerAndVerify();

        forgotPassword(email).andExpect(status().isOk());
        String code = latestResetCode(email);

        MvcResult result = resetPassword(email, code, "NewPassword456")
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getContentAsString()).contains("\"token\"");

        loginAttempt(email, "Password123").andExpect(status().isUnauthorized());
        loginAttempt(email, "NewPassword456").andExpect(status().isOk());
    }

    @Test
    void forgotPasswordReturnsTheSameGenericResponseWhetherOrNotTheAccountExists() throws Exception {
        String realEmail = registerAndVerify();
        String nonexistentEmail = "t38-nobody-" + UUID.randomUUID() + "@test.local";

        MvcResult realResult = forgotPassword(realEmail).andExpect(status().isOk()).andReturn();
        MvcResult fakeResult = forgotPassword(nonexistentEmail).andExpect(status().isOk()).andReturn();

        assertThat(realResult.getResponse().getContentAsString())
                .isEqualTo(fakeResult.getResponse().getContentAsString());
    }

    @Test
    void aPasswordResetCodeIsRejectedByVerifyEmail() throws Exception {
        String email = registerAndVerify();

        forgotPassword(email).andExpect(status().isOk());
        String resetCode = latestResetCode(email);

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", resetCode))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anEmailVerificationCodeIsRejectedByResetPassword() throws Exception {
        // register() issues an EMAIL_VERIFICATION code but don't consume it --
        // reset-password must not accept it even though it's a real, live code.
        String email = "t38-user-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T38-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());
        String verificationCode = FakeMailConfig.lastCodeSentTo(email);
        assertThat(verificationCode).isNotNull();

        resetPassword(email, verificationCode, "NewPassword456").andExpect(status().isBadRequest());
    }

    @Test
    void weakNewPasswordIsRejected() throws Exception {
        String email = registerAndVerify();

        forgotPassword(email).andExpect(status().isOk());
        String code = latestResetCode(email);

        resetPassword(email, code, "short").andExpect(status().isBadRequest());
    }

    @Test
    void successfulResetAlsoMarksTheAccountVerified() throws Exception {
        // A user who registered but never finished T37's verification step
        // (e.g. a pre-existing account retroactively marked unverified) can
        // still recover via forgot-password -- and doing so proves control
        // of the inbox, so it should verify the account too.
        String email = "t38-unverified-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T38-Org2-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        loginAttempt(email, "Password123").andExpect(status().isForbidden());

        forgotPassword(email).andExpect(status().isOk());
        String code = latestResetCode(email);
        resetPassword(email, code, "NewPassword456").andExpect(status().isOk());

        loginAttempt(email, "NewPassword456").andExpect(status().isOk());
    }

    // ===== helpers =====

    private String registerAndVerify() throws Exception {
        String email = "t38-user-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T38-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String verificationCode = FakeMailConfig.lastCodeSentTo(email);
        assertThat(verificationCode).isNotNull();
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", verificationCode))))
                .andExpect(status().isOk());

        return email;
    }

    private String latestResetCode(String email) {
        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).as("expected a reset code to have been emailed to " + email).isNotNull();
        return code;
    }

    private ResultActions forgotPassword(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email))));
    }

    private ResultActions resetPassword(String email, String code, String newPassword) throws Exception {
        return mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", email, "code", code, "newPassword", newPassword))));
    }

    private ResultActions loginAttempt(String email, String password) throws Exception {
        // X-Forwarded-For keyed to the (unique, random) email keeps this test's
        // LoginAttemptService IP-bucket isolated from every other test class --
        // otherwise every MockMvc call in the suite shares one default remote
        // address, and their failed-login counts would pile up in the same
        // bucket (LoginAttemptService is a singleton reused across @SpringBootTest
        // classes) and could eventually 429 an unrelated test.
        return mockMvc.perform(post("/api/auth/login")
                .header("X-Forwarded-For", email)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))));
    }
}
