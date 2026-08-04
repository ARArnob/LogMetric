package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T43 (PLAN.md): service display aliases. There is no Service entity --
 * rawServiceName stays the source of truth everywhere else (ingestion,
 * filtering, aggregation); this table is purely a read-time label lookup.
 * ADMIN can read/write/clear; any authenticated org member can read; a
 * different org's alias for the same raw name is never visible.
 *
 * Same infra requirement as the other integration tests here: needs
 * `docker compose up -d` running first. Mail is captured in-memory via
 * FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class ServiceAliasTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void adminCanUpsertAndListAnAlias() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String raw = "auth-svc-" + UUID.randomUUID();

        upsert(adminToken, raw, "Authentication").andExpect(status().isOk());

        MvcResult result = list(adminToken).andExpect(status().isOk()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        boolean found = false;
        for (JsonNode node : json) {
            if (node.get("rawServiceName").asText().equals(raw)) {
                assertThat(node.get("displayName").asText()).isEqualTo("Authentication");
                found = true;
            }
        }
        assertThat(found).as("expected the new alias to appear in the list").isTrue();
    }

    @Test
    void upsertingTheSameRawNameAgainReplacesTheDisplayName() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String raw = "payments-" + UUID.randomUUID();

        upsert(adminToken, raw, "Payments v1").andExpect(status().isOk());
        upsert(adminToken, raw, "Payments v2").andExpect(status().isOk());

        MvcResult result = list(adminToken).andExpect(status().isOk()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long matching = 0;
        for (JsonNode node : json) {
            if (node.get("rawServiceName").asText().equals(raw)) {
                assertThat(node.get("displayName").asText()).isEqualTo("Payments v2");
                matching++;
            }
        }
        assertThat(matching).as("upsert must replace, not duplicate, the row").isEqualTo(1);
    }

    @Test
    void deletingAnAliasRemovesItFromTheList() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String raw = "ingest-worker-" + UUID.randomUUID();

        upsert(adminToken, raw, "Ingest Worker").andExpect(status().isOk());
        mockMvc.perform(delete("/api/service-aliases")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("rawServiceName", raw))
                .andExpect(status().isNoContent());

        MvcResult result = list(adminToken).andExpect(status().isOk()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode node : json) {
            assertThat(node.get("rawServiceName").asText()).isNotEqualTo(raw);
        }
    }

    @Test
    void nonAdminCanListButNotWriteOrDelete() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();

        String memberEmail = "t43-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", memberEmail, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        String memberCode = FakeMailConfig.lastCodeSentTo(memberEmail);
        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", memberEmail, "code", memberCode))))
                .andExpect(status().isOk())
                .andReturn();
        String memberToken = objectMapper.readTree(verifyResult.getResponse().getContentAsString()).get("token").asText();

        list(memberToken).andExpect(status().isOk());
        upsert(memberToken, "some-service", "Some Service").andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/service-aliases")
                        .header("Authorization", "Bearer " + memberToken)
                        .param("rawServiceName", "some-service"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anotherOrganizationsAliasIsNeverVisible() throws Exception {
        String orgAToken = registerVerifiedAdmin();
        String orgBToken = registerVerifiedAdmin();
        String raw = "shared-name-" + UUID.randomUUID();

        upsert(orgAToken, raw, "Org A's Label").andExpect(status().isOk());

        MvcResult result = list(orgBToken).andExpect(status().isOk()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode node : json) {
            assertThat(node.get("rawServiceName").asText()).isNotEqualTo(raw);
        }
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/service-aliases")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/service-aliases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("rawServiceName", "x", "displayName", "X"))))
                .andExpect(status().isUnauthorized());
    }

    // ===== helpers =====

    private String registerVerifiedAdmin() throws Exception {
        String email = "t43-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T43-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions upsert(String token, String rawServiceName, String displayName) throws Exception {
        return mockMvc.perform(put("/api/service-aliases")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "rawServiceName", rawServiceName, "displayName", displayName))));
    }

    private ResultActions list(String token) throws Exception {
        return mockMvc.perform(get("/api/service-aliases").header("Authorization", "Bearer " + token));
    }
}
