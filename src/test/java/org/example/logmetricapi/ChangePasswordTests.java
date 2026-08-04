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
 * T42 (PLAN.md): change password while logged in -- requires the current
 * password, enforces the same min-8 rule as signup, and a successful change
 * invalidates the old password for future logins.
 *
 * Same infra requirement as the other integration tests here: needs
 * `docker compose up -d` running first. Mail is captured in-memory via
 * FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class ChangePasswordTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void wrongCurrentPasswordIsRejected() throws Exception {
        String email = registerAndVerify();
        String token = loginAndGetToken(email, "Password123");

        changePassword(token, "notMyPassword", "NewPassword456").andExpect(status().isBadRequest());
        loginAttempt(email, "Password123").andExpect(status().isOk());
    }

    @Test
    void weakNewPasswordIsRejected() throws Exception {
        String email = registerAndVerify();
        String token = loginAndGetToken(email, "Password123");

        changePassword(token, "Password123", "short").andExpect(status().isBadRequest());
    }

    @Test
    void successfulChangeInvalidatesTheOldPasswordAndAllowsTheNewOne() throws Exception {
        String email = registerAndVerify();
        String token = loginAndGetToken(email, "Password123");

        changePassword(token, "Password123", "NewPassword456").andExpect(status().isOk());

        loginAttempt(email, "Password123").andExpect(status().isUnauthorized());
        loginAttempt(email, "NewPassword456").andExpect(status().isOk());
    }

    @Test
    void unauthenticatedChangeIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "Password123", "newPassword", "NewPassword456"))))
                .andExpect(status().isUnauthorized());
    }

    // ===== helpers =====

    private String registerAndVerify() throws Exception {
        String email = "t42-user-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T42-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk());

        return email;
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = loginAttempt(email, password).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions loginAttempt(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))));
    }

    private ResultActions changePassword(String token, String currentPassword, String newPassword) throws Exception {
        return mockMvc.perform(post("/api/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "currentPassword", currentPassword, "newPassword", newPassword))));
    }
}
