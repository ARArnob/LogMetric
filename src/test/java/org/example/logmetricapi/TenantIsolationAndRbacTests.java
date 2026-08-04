package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.service.SseService;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T35 (PLAN.md): pins down the two properties this project treats as
 * non-negotiable -- tenant isolation (PLAN.md §0.5) and RBAC -- as automated
 * tests instead of one-off manual curl checks, ahead of Phase 1 (T9-T12)
 * re-scoping ApiKey/systemId in exactly this code path.
 *
 * Runs against the real local dev stack (Postgres + Elasticsearch from
 * docker-compose) -- there is no test container/profile in this project, so
 * these are true integration tests, not hermetic unit tests. Requires
 * `docker compose up -d` to be running first, same as the app itself.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class TenantIsolationAndRbacTests {

    @Autowired
    private MockMvc mockMvc;

    // Own instance rather than autowiring the app's ObjectMapper bean -- these
    // tests only need to build/read plain request/response JSON, nothing the
    // app's Jackson customizations (if any) would affect.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    @Autowired
    private SseService sseService;

    private final List<String> indexedLogIdsToClean = new ArrayList<>();

    @AfterEach
    void cleanUpIndexedLogs() {
        for (String id : indexedLogIdsToClean) {
            elasticsearchOperations.delete(id, LogEntry.class);
        }
        indexedLogIdsToClean.clear();
    }

    // ===== Tenant isolation =====

    @Test
    void searchNeverReturnsAnotherOrganizationsLogs() throws Exception {
        RegisteredUser orgA = registerNewOrg();
        RegisteredUser orgB = registerNewOrg();

        String messageA = "t35 marker A " + UUID.randomUUID();
        String messageB = "t35 marker B " + UUID.randomUUID();
        indexLog(String.valueOf(orgA.organizationId()), messageA);
        indexLog(String.valueOf(orgB.organizationId()), messageB);

        JsonNode resultA = searchAll(orgA.token());
        assertThat(resultA.get("total").asLong()).isEqualTo(1);
        assertThat(resultA.get("logs").get(0).get("message").asText()).isEqualTo(messageA);

        JsonNode resultB = searchAll(orgB.token());
        assertThat(resultB.get("total").asLong()).isEqualTo(1);
        assertThat(resultB.get("logs").get(0).get("message").asText()).isEqualTo(messageB);
    }

    @Test
    void sseStreamOnlyReceivesItsOwnOrganizationsBroadcasts() throws Exception {
        RegisteredUser orgA = registerNewOrg();

        // A real async request through the actual controller (LogController.streamLogs),
        // not a direct SseService call -- this exercises the same
        // AuthUtils.requireOrganizationIdAsString derivation from a real JWT that T1/T2
        // were about. The request stays "open" (async, undispatched) for the rest of the
        // test, so writes broadcast() makes after this point land on the same response.
        MvcResult streamResult = mockMvc.perform(get("/api/logs/stream")
                        .header("Authorization", "Bearer " + orgA.token()))
                .andExpect(request().asyncStarted())
                .andReturn();

        assertThat(streamResult.getResponse().getContentAsString())
                .as("subscribing should immediately send the INIT event")
                .contains("Connected to LogMetric Stream");

        String otherOrgId = "t35-other-org-" + UUID.randomUUID();
        String markerForOtherOrg = "t35 sse cross-org marker " + UUID.randomUUID();
        sseService.broadcast(new LogEntry("t35-sse-" + UUID.randomUUID(), Instant.now(), "INFO",
                "t35-test-service", null, markerForOtherOrg, null, "t35-pattern", otherOrgId));

        String markerForOwnOrg = "t35 sse own-org marker " + UUID.randomUUID();
        sseService.broadcast(new LogEntry("t35-sse-" + UUID.randomUUID(), Instant.now(), "INFO",
                "t35-test-service", null, markerForOwnOrg, null, "t35-pattern", String.valueOf(orgA.organizationId())));

        String received = streamResult.getResponse().getContentAsString();
        assertThat(received).as("must receive a broadcast addressed to its own organization").contains(markerForOwnOrg);
        assertThat(received).as("must never receive a broadcast addressed to a different organization").doesNotContain(markerForOtherOrg);
    }

    // ===== RBAC =====

    @Test
    void adminOnlyEndpoints_rejectUserRole() throws Exception {
        RegisteredUser admin = registerNewOrg();
        long systemId = createSystem(admin.token());
        String inviteCode = createInvite(admin.token());
        RegisteredUser member = joinOrgAsUser(inviteCode);

        assertStatus(post("/api/systems/" + systemId + "/keys"), member.token(), 403);
        assertStatus(get("/api/keys"), member.token(), 403);
        assertStatus(get("/api/users"), member.token(), 403);
        assertStatus(post("/api/invites"), member.token(), 403);
        // authorization is denied before the target id is even looked up, so an
        // arbitrary id is enough to prove the guard fires -- this isn't testing
        // the 404-vs-403 cross-org lookup behavior, just the role gate itself.
        assertStatus(
                patch("/api/users/1/role").contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"),
                member.token(),
                403
        );
    }

    @Test
    void adminOnlyEndpoints_allowAdminRole() throws Exception {
        RegisteredUser admin = registerNewOrg();
        long systemId = createSystem(admin.token());

        assertStatus(post("/api/systems/" + systemId + "/keys"), admin.token(), 200);
        assertStatus(get("/api/keys"), admin.token(), 200);
        assertStatus(get("/api/users"), admin.token(), 200);
        assertStatus(post("/api/invites"), admin.token(), 200);
    }

    @Test
    void adminOnlyEndpoints_rejectMissingAuthentication() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/invites")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/systems/1/keys")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/keys")).andExpect(status().isUnauthorized());
    }

    // B5 (UI-PLAN.md): GET /api/keys lists key metadata, org-scoped, and never
    // leaks the raw key -- only the same 8-char prefix already shown once at
    // generation time.
    @Test
    void apiKeyList_isOrgScopedAndNeverExposesTheRawKey() throws Exception {
        RegisteredUser orgA = registerNewOrg();
        long systemId = createSystem(orgA.token());
        MvcResult genResult = mockMvc.perform(post("/api/systems/" + systemId + "/keys")
                        .header("Authorization", "Bearer " + orgA.token()))
                .andReturn();
        assertThat(genResult.getResponse().getStatus()).isEqualTo(200);
        String rawKey = objectMapper.readTree(genResult.getResponse().getContentAsString()).get("apiKey").asText();

        MvcResult listResult = mockMvc.perform(get("/api/keys").header("Authorization", "Bearer " + orgA.token()))
                .andReturn();
        assertThat(listResult.getResponse().getStatus()).isEqualTo(200);
        JsonNode keys = objectMapper.readTree(listResult.getResponse().getContentAsString());
        assertThat(keys).hasSize(1);
        assertThat(keys.get(0).get("maskedHint").asText()).isEqualTo(rawKey.substring(0, 8) + "…");
        assertThat(listResult.getResponse().getContentAsString()).doesNotContain(rawKey);
        assertThat(keys.get(0).get("systemId").asLong()).isEqualTo(systemId);
        assertThat(keys.get(0).get("revoked").asBoolean()).isFalse();

        RegisteredUser orgB = registerNewOrg();
        MvcResult listResultB = mockMvc.perform(get("/api/keys").header("Authorization", "Bearer " + orgB.token()))
                .andReturn();
        assertThat(objectMapper.readTree(listResultB.getResponse().getContentAsString())).isEmpty();
    }

    // ===== helpers =====

    private record RegisteredUser(String token, long organizationId) {
    }

    private RegisteredUser registerNewOrg() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String email = "t35-admin-" + suffix + "@test.local";
        Map<String, String> body = Map.of(
                "email", email,
                "password", "Password123",
                "organizationName", "T35-Org-" + suffix
        );
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return verifyEmail(email);
    }

    private long createSystem(String adminToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/systems")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"t35-system\"}"))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private String createInvite(String adminToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();
    }

    private RegisteredUser joinOrgAsUser(String inviteCode) throws Exception {
        String email = "t35-member-" + UUID.randomUUID() + "@test.local";
        Map<String, String> body = Map.of(
                "email", email,
                "password", "Password123",
                "inviteCode", inviteCode
        );
        MvcResult result = mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return verifyEmail(email);
    }

    // T37: register/register-with-invite no longer return a token directly --
    // both now require confirming the emailed OTP first (see FakeMailConfig).
    private RegisteredUser verifyEmail(String email) throws Exception {
        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).as("expected a verification code to have been emailed to " + email).isNotNull();

        Map<String, String> body = Map.of("email", email, "code", code);
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new RegisteredUser(json.get("token").asText(), json.get("organizationId").asLong());
    }

    private void assertStatus(MockHttpServletRequestBuilder builder, String bearerToken, int expectedStatus) throws Exception {
        mockMvc.perform(builder.header("Authorization", "Bearer " + bearerToken))
                .andExpect(status().is(expectedStatus));
    }

    private JsonNode searchAll(String bearerToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/logs/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + bearerToken)
                        .content("{}"))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void indexLog(String organizationId, String message) {
        LogEntry entry = new LogEntry(
                "t35-" + UUID.randomUUID(), Instant.now(), "INFO", "t35-test-service",
                null, message, null, "t35-pattern", organizationId
        );
        LogEntry saved = elasticsearchOperations.save(entry);
        indexedLogIdsToClean.add(saved.getId());
        elasticsearchOperations.indexOps(LogEntry.class).refresh();
    }
}
