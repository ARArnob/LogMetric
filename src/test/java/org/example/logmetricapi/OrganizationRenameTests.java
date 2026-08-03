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

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T41 (PLAN.md): organization rename -- admin-only, org-scoped (PATCH with
 * no id in the path, same pattern as /api/invites), rejects a name already
 * claimed by a *different* org, and re-saving the current name is not
 * treated as a self-collision.
 *
 * Same infra requirement as the other integration tests here: needs
 * `docker compose up -d` running first. Mail is captured in-memory via
 * FakeMailConfig, not sent through real SMTP/MailHog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class OrganizationRenameTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void adminCanRenameTheirOwnOrganization() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String newName = "Renamed Org " + UUID.randomUUID();

        MvcResult result = rename(adminToken, newName).andExpect(status().isOk()).andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("name").asText()).isEqualTo(newName);
    }

    @Test
    void renamingToTheCurrentNameIsNotATreatedAsACollision() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String currentName = objectMapper.readTree(
                rename(adminToken, "First Name " + UUID.randomUUID()).andReturn().getResponse().getContentAsString()
        ).get("name").asText();

        rename(adminToken, currentName).andExpect(status().isOk());
    }

    @Test
    void renamingToAnotherOrganizationsNameIsRejected() throws Exception {
        String takenName = "Taken Org Name " + UUID.randomUUID();
        registerVerifiedAdmin(takenName);

        String adminToken = registerVerifiedAdmin();
        rename(adminToken, takenName).andExpect(status().isConflict());
    }

    @Test
    void nonAdminCannotRenameTheOrganization() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();

        String memberEmail = "t41-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", memberEmail, "password", "password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        String memberCode = FakeMailConfig.lastCodeSentTo(memberEmail);
        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", memberEmail, "code", memberCode))))
                .andExpect(status().isOk())
                .andReturn();
        String memberToken = objectMapper.readTree(verifyResult.getResponse().getContentAsString()).get("token").asText();

        rename(memberToken, "Should Not Apply").andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRenameIsRejected() throws Exception {
        mockMvc.perform(patch("/api/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Should Not Apply"))))
                .andExpect(status().isUnauthorized());
    }

    // ===== helpers =====

    private String registerVerifiedAdmin() throws Exception {
        return registerVerifiedAdmin("T41-Org-" + UUID.randomUUID());
    }

    private String registerVerifiedAdmin(String organizationName) throws Exception {
        String email = "t41-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "password123", "organizationName", organizationName))))
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

    private org.springframework.test.web.servlet.ResultActions rename(String token, String name) throws Exception {
        return mockMvc.perform(patch("/api/organizations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", name))));
    }
}
