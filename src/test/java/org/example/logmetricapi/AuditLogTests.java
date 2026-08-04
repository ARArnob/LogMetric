package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.AuditLog;
import org.example.logmetricapi.repository.AuditLogRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T24 (PLAN.md): every admin-facing mutation (and login) is recorded into an
 * org-scoped AuditLog, readable only by an ADMIN of that org, with a
 * caller-chosen retention purge -- not a silent background sweep.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class AuditLogTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void loginRecordsAnAuditEntry() throws Exception {
        String email = "t24-login-" + UUID.randomUUID() + "@test.local";
        registerVerifiedAdmin(email);

        login(email, "Password123").andExpect(status().isOk());

        JsonNode logs = fetchLogs(loginAndGetToken(email, "Password123"));
        assertThat(anyEntryMatches(logs, "LOGIN", email, null)).isTrue();
    }

    @Test
    void keyGenerationRecordsAnAuditEntryNamingTheSystem() throws Exception {
        String email = "t24-keygen-" + UUID.randomUUID() + "@test.local";
        String token = registerVerifiedAdmin(email);
        long systemId = createSystem(token, "t24-system");

        mockMvc.perform(post("/api/systems/" + systemId + "/keys").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        JsonNode logs = fetchLogs(token);
        assertThat(anyEntryMatches(logs, "KEY_GENERATED", email, "t24-system")).isTrue();
    }

    @Test
    void alertRuleLifecycleRecordsCreateUpdateAndDelete() throws Exception {
        String email = "t24-rule-" + UUID.randomUUID() + "@test.local";
        String token = registerVerifiedAdmin(email);

        MvcResult createResult = mockMvc.perform(post("/api/alert-rules")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "t24-rule", "metric", "ERROR_RATE", "threshold", 0.5,
                                "windowSeconds", 300, "targetEmails", List.of(), "enabled", true))))
                .andExpect(status().isOk()).andReturn();
        long ruleId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/alert-rules/" + ruleId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "t24-rule", "metric", "ERROR_RATE", "threshold", 0.9,
                                "windowSeconds", 300, "targetEmails", List.of(), "enabled", false))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/alert-rules/" + ruleId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        JsonNode logs = fetchLogs(token);
        assertThat(anyEntryMatches(logs, "ALERT_RULE_CREATED", email, "t24-rule")).isTrue();
        assertThat(anyEntryMatches(logs, "ALERT_RULE_UPDATED", email, "t24-rule")).isTrue();
        assertThat(anyEntryMatches(logs, "ALERT_RULE_DELETED", email, "t24-rule")).isTrue();
    }

    @Test
    void roleChangeRecordsAnAuditEntryWithOldAndNewRole() throws Exception {
        String adminEmail = "t24-admin-" + UUID.randomUUID() + "@test.local";
        String adminToken = registerVerifiedAdmin(adminEmail);

        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();

        String memberEmail = "t24-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", memberEmail, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        String memberCode = FakeMailConfig.lastCodeSentTo(memberEmail);
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", memberEmail, "code", memberCode))))
                .andExpect(status().isOk());

        MvcResult usersResult = mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode users = objectMapper.readTree(usersResult.getResponse().getContentAsString());
        long memberId = -1;
        for (JsonNode u : users) {
            if (u.get("email").asText().equals(memberEmail)) memberId = u.get("id").asLong();
        }
        assertThat(memberId).as("expected to find the invited member in the org's user list").isNotEqualTo(-1);

        mockMvc.perform(patch("/api/users/" + memberId + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk());

        JsonNode logs = fetchLogs(adminToken);
        assertThat(anyEntryMatches(logs, "ROLE_CHANGED", adminEmail, memberEmail + ": USER -> ADMIN")).isTrue();
    }

    @Test
    void auditLogEndpointsAreAdminOnly() throws Exception {
        String adminEmail = "t24-rbac-admin-" + UUID.randomUUID() + "@test.local";
        String adminToken = registerVerifiedAdmin(adminEmail);

        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();
        String memberEmail = "t24-rbac-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", memberEmail, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        String memberCode = FakeMailConfig.lastCodeSentTo(memberEmail);
        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", memberEmail, "code", memberCode))))
                .andExpect(status().isOk()).andReturn();
        String memberToken = objectMapper.readTree(verifyResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/audit-logs").header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/audit-logs").param("olderThanDays", "30")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/audit-logs")).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/audit-logs").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void auditLogsAreOrgScoped() throws Exception {
        String orgAEmail = "t24-scope-a-" + UUID.randomUUID() + "@test.local";
        String orgAToken = registerVerifiedAdmin(orgAEmail);
        String orgBToken = registerVerifiedAdmin("t24-scope-b-" + UUID.randomUUID() + "@test.local");

        createSystem(orgAToken, "t24-scope-marker-system");

        JsonNode orgBLogs = fetchLogs(orgBToken);
        assertThat(anyEntryMatches(orgBLogs, "SYSTEM_CREATED", orgAEmail, "t24-scope-marker-system")).isFalse();
    }

    @Test
    void purgeDeletesOnlyEntriesOlderThanTheCutoffAndOnlyForTheCallersOrg() throws Exception {
        String orgAEmail = "t24-purge-a-" + UUID.randomUUID() + "@test.local";
        String orgAToken = registerVerifiedAdmin(orgAEmail);
        String orgBEmail = "t24-purge-b-" + UUID.randomUUID() + "@test.local";
        String orgBToken = registerVerifiedAdmin(orgBEmail);

        // Both orgs get one recent entry (the registration's own audit
        // footprint isn't relevant -- these markers are created explicitly)
        // and one backdated one, via direct repository access.
        createSystem(orgAToken, "t24-purge-recent-a");
        createSystem(orgBToken, "t24-purge-recent-b");

        backdateLatestEntryFor(orgAToken, orgAEmail, "t24-purge-old-a", 100);
        backdateLatestEntryFor(orgBToken, orgBEmail, "t24-purge-old-b", 100);

        MvcResult purgeResult = mockMvc.perform(delete("/api/audit-logs").param("olderThanDays", "30")
                        .header("Authorization", "Bearer " + orgAToken))
                .andExpect(status().isOk()).andReturn();
        assertThat(objectMapper.readTree(purgeResult.getResponse().getContentAsString()).get("deleted").asLong())
                .isGreaterThanOrEqualTo(1);

        JsonNode orgALogsAfter = fetchLogs(orgAToken);
        assertThat(anyEntryMatches(orgALogsAfter, "SYSTEM_CREATED", orgAEmail, "t24-purge-old-a")).isFalse();
        assertThat(anyEntryMatches(orgALogsAfter, "SYSTEM_CREATED", orgAEmail, "t24-purge-recent-a")).isTrue();

        // Org A's purge must never touch org B's history.
        JsonNode orgBLogsAfter = fetchLogs(orgBToken);
        assertThat(anyEntryMatches(orgBLogsAfter, "SYSTEM_CREATED", orgBEmail, "t24-purge-old-b")).isTrue();
    }

    // ===== helpers =====

    private void backdateLatestEntryFor(String token, String actorEmail, String systemName, int daysAgo) throws Exception {
        createSystem(token, systemName);
        AuditLog entry = auditLogRepository.findAll().stream()
                .filter(e -> actorEmail.equals(e.getActorEmail()) && systemName.equals(e.getDetail()))
                .findFirst()
                .orElseThrow();
        entry.setCreatedAt(Timestamp.from(Instant.now().minus(daysAgo, ChronoUnit.DAYS)));
        auditLogRepository.save(entry);
    }

    private boolean anyEntryMatches(JsonNode logs, String action, String actorEmail, String detail) {
        for (JsonNode entry : logs) {
            boolean actionMatches = entry.get("action").asText().equals(action);
            boolean actorMatches = entry.get("actorEmail").asText().equals(actorEmail);
            boolean detailMatches = detail == null || detail.equals(entry.path("detail").asText(null));
            if (actionMatches && actorMatches && detailMatches) return true;
        }
        return false;
    }

    private JsonNode fetchLogs(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/audit-logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("logs");
    }

    private long createSystem(String token, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/systems")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", name))))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private String registerVerifiedAdmin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T24-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = login(email, password).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))));
    }
}
