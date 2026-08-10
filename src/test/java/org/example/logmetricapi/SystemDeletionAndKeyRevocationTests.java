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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Found while building the Settings System-management UI: DELETE
 * /api/systems/{id} had existed since T12 but was never exercised by any
 * frontend, so nobody had noticed it crashes with a raw 500 (FK violation)
 * against a system that still has an API key -- there was also no way to
 * revoke a key at all, which would have made that a permanent dead end.
 * This covers both: revoking a key (new), and deleting a system now
 * requiring its keys be revoked first, not just gone.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class SystemDeletionAndKeyRevocationTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deletingASystemWithAnActiveKeyIsRejectedNotA500() throws Exception {
        String adminToken = registerVerifiedAdmin();
        long systemId = createSystem(adminToken, "sys-with-key");
        generateKey(adminToken, systemId);

        mockMvc.perform(delete("/api/systems/" + systemId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    void revokingItsOnlyKeyThenAllowsTheSystemToBeDeleted() throws Exception {
        String adminToken = registerVerifiedAdmin();
        long systemId = createSystem(adminToken, "sys-revoke-then-delete");
        long keyId = generateKeyAndGetId(adminToken, systemId);

        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/systems/" + systemId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void deletingASystemWithNoKeysEverGeneratedStillWorks() throws Exception {
        String adminToken = registerVerifiedAdmin();
        long systemId = createSystem(adminToken, "sys-no-keys");

        mockMvc.perform(delete("/api/systems/" + systemId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void revokedKeyCanNoLongerIngestLogs() throws Exception {
        String adminToken = registerVerifiedAdmin();
        long systemId = createSystem(adminToken, "sys-revoke-ingest");
        MvcResult genResult = mockMvc.perform(post("/api/systems/" + systemId + "/keys")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        String rawKey = objectMapper.readTree(genResult.getResponse().getContentAsString()).get("apiKey").asText();

        mockMvc.perform(post("/api/logs")
                        .header("X-Api-Key", rawKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "level", "INFO", "serviceName", "svc", "message", "before revoke"))))
                .andExpect(status().isAccepted());

        long keyId = findKeyIdByPrefix(adminToken, rawKey.substring(0, 8));
        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/logs")
                        .header("X-Api-Key", rawKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "level", "INFO", "serviceName", "svc", "message", "after revoke"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deletingAnAlreadyRevokedKeyHardDeletesIt() throws Exception {
        String adminToken = registerVerifiedAdmin();
        long systemId = createSystem(adminToken, "sys-double-revoke");
        long keyId = generateKeyAndGetId(adminToken, systemId);

        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        MvcResult listResult = mockMvc.perform(get("/api/keys").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode keys = objectMapper.readTree(listResult.getResponse().getContentAsString());
        for (JsonNode key : keys) {
            assertThat(key.get("id").asLong()).isNotEqualTo(keyId);
        }
    }

    @Test
    void revokeKeyIsAdminOnlyOrgScopedAndRequiresAuthentication() throws Exception {
        String orgAAdminToken = registerVerifiedAdmin();
        long systemId = createSystem(orgAAdminToken, "sys-rbac");
        long keyId = generateKeyAndGetId(orgAAdminToken, systemId);

        String orgBAdminToken = registerVerifiedAdmin();
        // 404, not 403 -- same don't-leak-existence pattern as every other
        // org-scoped resource in this codebase.
        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + orgBAdminToken))
                .andExpect(status().isNotFound());

        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + orgAAdminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();
        String memberToken = registerVerifiedInvitee(inviteCode);
        mockMvc.perform(delete("/api/keys/" + keyId).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/keys/" + keyId)).andExpect(status().isUnauthorized());
    }

    // ===== helpers =====

    private long findKeyIdByPrefix(String adminToken, String prefix) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/keys").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode keys = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode k : keys) {
            if (k.get("maskedHint").asText().startsWith(prefix)) return k.get("id").asLong();
        }
        throw new AssertionError("Could not find a key with prefix " + prefix);
    }

    private void generateKey(String adminToken, long systemId) throws Exception {
        mockMvc.perform(post("/api/systems/" + systemId + "/keys").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    private long generateKeyAndGetId(String adminToken, long systemId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/systems/" + systemId + "/keys")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        String rawKey = objectMapper.readTree(result.getResponse().getContentAsString()).get("apiKey").asText();
        return findKeyIdByPrefix(adminToken, rawKey.substring(0, 8));
    }

    private long createSystem(String adminToken, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/systems")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", name))))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private String registerVerifiedAdmin() throws Exception {
        String email = "syskey-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "SysKey-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());
        return verifyEmailAndGetToken(email);
    }

    private String registerVerifiedInvitee(String inviteCode) throws Exception {
        String email = "syskey-member-" + UUID.randomUUID() + "@test.local";
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
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
}
