package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.AlertMetric;
import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.AlertRuleRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.scheduler.AlertScheduler;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * T21+T22 (PLAN.md): evaluation and delivery, tested together since a
 * triggered rule with nothing downstream to check would be a weaker test --
 * this exercises the full loop against the real dev stack (Postgres + ES),
 * calling AlertScheduler directly rather than waiting out its 60s
 * @Scheduled tick.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class AlertEvaluationAndDeliveryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    @Autowired
    private AlertRuleRepository alertRuleRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private AlertScheduler alertScheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final List<String> indexedLogIdsToClean = new ArrayList<>();

    @AfterEach
    void cleanUpIndexedLogs() {
        for (String id : indexedLogIdsToClean) {
            elasticsearchOperations.delete(id, LogEntry.class);
        }
        indexedLogIdsToClean.clear();
    }

    @Test
    void breachingErrorRateDeliversOnceThenSuppressesWithinCooldown() throws Exception {
        RegisteredAdmin admin = registerVerifiedAdmin();

        // 3 of 4 logs are ERROR -> 75% error rate, comfortably over a 50% threshold.
        indexLog(admin.organizationId(), "ERROR", "t21 error marker " + UUID.randomUUID());
        indexLog(admin.organizationId(), "ERROR", "t21 error marker " + UUID.randomUUID());
        indexLog(admin.organizationId(), "ERROR", "t21 error marker " + UUID.randomUUID());
        indexLog(admin.organizationId(), "INFO", "t21 info marker " + UUID.randomUUID());

        Organization org = organizationRepository.findById(admin.organizationId()).orElseThrow();
        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("t21-error-rate-rule-" + UUID.randomUUID());
        rule.setMetric(AlertMetric.ERROR_RATE);
        rule.setThreshold(0.5);
        rule.setWindowSeconds(300);
        Set<String> recipients = new HashSet<>();
        recipients.add(admin.email());
        rule.setTargetEmails(recipients);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule = alertRuleRepository.save(rule);

        // Subscribe to the org-scoped alert SSE channel before triggering, same
        // "real async request through the actual controller" approach the T35
        // log-stream test uses -- proves the whole path, not just SseService in isolation.
        MvcResult streamResult = mockMvc.perform(get("/api/alerts/stream")
                        .header("Authorization", "Bearer " + admin.token()))
                .andExpect(request().asyncStarted())
                .andReturn();
        assertThat(streamResult.getResponse().getContentAsString())
                .contains("Connected to LogMetric Alerts Stream");

        int emailsBefore = FakeMailConfig.sendCountTo(admin.email());

        alertScheduler.evaluateAlertRules();

        assertThat(FakeMailConfig.sendCountTo(admin.email()))
                .as("exactly one email should have been sent for this trigger")
                .isEqualTo(emailsBefore + 1);

        String sseBody = streamResult.getResponse().getContentAsString();
        assertThat(sseBody).as("the alert SSE channel should have received one alert event")
                .contains(rule.getName());

        // Second evaluation, immediately after -- still within the cooldown
        // window (default 900s), so no second email should go out.
        alertScheduler.evaluateAlertRules();

        assertThat(FakeMailConfig.sendCountTo(admin.email()))
                .as("a second trigger inside the cooldown must not send another email")
                .isEqualTo(emailsBefore + 1);
    }

    // ===== helpers =====

    private record RegisteredAdmin(String token, long organizationId, String email) {
    }

    private RegisteredAdmin registerVerifiedAdmin() throws Exception {
        String email = "t21-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "T21-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new RegisteredAdmin(json.get("token").asText(), json.get("organizationId").asLong(), email);
    }

    private void indexLog(long organizationId, String level, String message) {
        LogEntry entry = new LogEntry(
                "t21-" + UUID.randomUUID(), Instant.now(), level, "t21-test-service",
                null, message, null, "t21-pattern", String.valueOf(organizationId)
        );
        LogEntry saved = elasticsearchOperations.save(entry);
        indexedLogIdsToClean.add(saved.getId());
        elasticsearchOperations.indexOps(LogEntry.class).refresh();
    }
}
