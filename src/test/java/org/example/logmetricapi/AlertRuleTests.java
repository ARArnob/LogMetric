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

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T20 (PLAN.md): AlertRule entity + CRUD. ADMIN-only end to end (unlike
 * SystemController's GET, there's no read-only carve-out here -- the plan
 * says "CRUD is ADMIN-only," full stop), org-scoped like every other
 * resource in this codebase, with the one T20-specific rule: a recipient
 * email must belong to a real member of the caller's own org.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class AlertRuleTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void adminCanCreateListUpdateAndDeleteARule() throws Exception {
        String adminToken = registerVerifiedAdmin();

        MvcResult createResult = createRule(adminToken, Map.of(
                "name", "High error rate",
                "metric", "ERROR_RATE",
                "threshold", 0.5,
                "windowSeconds", 300,
                "targetEmails", List.of(),
                "enabled", true
        )).andExpect(status().isOk()).andReturn();
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long id = created.get("id").asLong();
        assertThat(created.get("name").asText()).isEqualTo("High error rate");
        assertThat(created.get("enabled").asBoolean()).isTrue();

        MvcResult listResult = mockMvc.perform(get("/api/alert-rules").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode list = objectMapper.readTree(listResult.getResponse().getContentAsString());
        boolean found = false;
        for (JsonNode node : list) {
            if (node.get("id").asLong() == id) found = true;
        }
        assertThat(found).as("created rule should appear in the org's list").isTrue();

        mockMvc.perform(put("/api/alert-rules/" + id)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "High error rate (updated)",
                                "metric", "ERROR_RATE",
                                "threshold", 0.75,
                                "windowSeconds", 600,
                                "targetEmails", List.of(),
                                "enabled", false
                        ))))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.name").value("High error rate (updated)"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.enabled").value(false));

        mockMvc.perform(delete("/api/alert-rules/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        MvcResult afterDelete = mockMvc.perform(get("/api/alert-rules").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode listAfter = objectMapper.readTree(afterDelete.getResponse().getContentAsString());
        for (JsonNode node : listAfter) {
            assertThat(node.get("id").asLong()).isNotEqualTo(id);
        }
    }

    @Test
    void creatingWithAnUnknownRecipientEmailIsRejected() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String bogusEmail = "not-a-member-" + UUID.randomUUID() + "@test.local";

        MvcResult result = createRule(adminToken, Map.of(
                "name", "Bad recipient rule",
                "metric", "ERROR_RATE",
                "threshold", 0.5,
                "windowSeconds", 300,
                "targetEmails", List.of(bogusEmail),
                "enabled", true
        )).andExpect(status().isBadRequest()).andReturn();

        assertThat(result.getResponse().getContentAsString()).contains(bogusEmail);
    }

    @Test
    void creatingWithARealOrgMemberRecipientSucceeds() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String adminEmail = extractEmailFromToken(adminToken);

        createRule(adminToken, Map.of(
                "name", "Self-paged rule",
                "metric", "VOLUME_ZSCORE",
                "threshold", 3.0,
                "windowSeconds", 60,
                "targetEmails", Set.of(adminEmail),
                "enabled", true
        )).andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.targetEmails[0]").value(adminEmail));
    }

    @Test
    void nonAdminIsForbiddenOnEveryEndpoint() throws Exception {
        String adminToken = registerVerifiedAdmin();
        MvcResult createResult = createRule(adminToken, basicEntropyRule()).andExpect(status().isOk()).andReturn();
        long id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();
        String memberToken = registerVerifiedInvitee(inviteCode);

        createRule(memberToken, basicEntropyRule()).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/alert-rules").header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/alert-rules/" + id)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(basicEntropyRule())))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/alert-rules/" + id).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anotherOrganizationsRuleIsNeverVisibleOrEditable() throws Exception {
        String orgAToken = registerVerifiedAdmin();
        String orgBToken = registerVerifiedAdmin();

        MvcResult createResult = createRule(orgAToken, basicEntropyRule()).andExpect(status().isOk()).andReturn();
        long orgARuleId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        MvcResult listResult = mockMvc.perform(get("/api/alert-rules").header("Authorization", "Bearer " + orgBToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode list = objectMapper.readTree(listResult.getResponse().getContentAsString());
        for (JsonNode node : list) {
            assertThat(node.get("id").asLong()).isNotEqualTo(orgARuleId);
        }

        // 404, not 403 -- same don't-leak-existence pattern as UserController/SystemController.
        mockMvc.perform(put("/api/alert-rules/" + orgARuleId)
                        .header("Authorization", "Bearer " + orgBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(basicEntropyRule())))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/alert-rules/" + orgARuleId).header("Authorization", "Bearer " + orgBToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/alert-rules")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/alert-rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(basicEntropyRule())))
                .andExpect(status().isUnauthorized());
    }

    // ===== helpers =====

    private Map<String, Object> basicEntropyRule() {
        return Map.of(
                "name", "Obfuscated payload rule",
                "metric", "ENTROPY",
                "threshold", 4.8,
                "windowSeconds", 300,
                "targetEmails", List.of(),
                "enabled", true
        );
    }

    private ResultActions createRule(String token, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/alert-rules")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String extractEmailFromToken(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("email").asText();
    }

    private String registerVerifiedAdmin() throws Exception {
        String email = "t20-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T20-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());
        return verifyEmailAndGetToken(email);
    }

    private String registerVerifiedInvitee(String inviteCode) throws Exception {
        String email = "t20-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        return verifyEmailAndGetToken(email);
    }

    private String verifyEmailAndGetToken(String email) throws Exception {
        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
}
