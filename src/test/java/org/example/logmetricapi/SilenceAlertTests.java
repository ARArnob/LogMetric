package org.example.logmetricapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.AlertMetric;
import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.AlertRuleRepository;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.service.AlertEvaluationService;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class SilenceAlertTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LogPatternRepository logPatternRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AlertRuleRepository alertRuleRepository;

    @Autowired
    private AlertEvaluationService alertEvaluationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void triggersWhenEstablishedPatternGoesSilent() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Silence Rule");
        rule.setMetric(AlertMetric.PATTERN_SILENCE);
        rule.setThreshold(2.0);
        rule.setWindowSeconds(3600);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        // Establish cadence: 10 occurrences, 1 minute apart
        long intervalMs = 60000L;
        Instant start = Instant.now().minusMillis(intervalMs * 15); // Start 15 mins ago
        for (int i = 0; i < 10; i++) {
            Timestamp t = Timestamp.from(start.plusMillis(intervalMs * i));
            logPatternRepository.recordOccurrence(org.getId(), "hash_silent", "heartbeat_pattern", "sample", t);
        }

        // Last seen was ~5 minutes ago (15 - 9 = 6 mins ago approx), interval is 1m.
        // Silence is ~6m, threshold is 2.0 * 1m = 2m. Should trigger.
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isTrue();
        assertThat(result.detail()).contains("Pattern 'heartbeat_pattern' has been silent for");
    }

    @Test
    void doesNotTriggerWhenPatternActivelyFiring() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Silence Rule Active");
        rule.setMetric(AlertMetric.PATTERN_SILENCE);
        rule.setThreshold(2.0);
        rule.setWindowSeconds(3600);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        long intervalMs = 60000L;
        Instant start = Instant.now().minusMillis(intervalMs * 10);
        for (int i = 0; i < 11; i++) {
            Timestamp t = Timestamp.from(start.plusMillis(intervalMs * i));
            logPatternRepository.recordOccurrence(org.getId(), "hash_active", "active_pattern", "sample", t);
        }

        // Last seen was just now, so silence is ~0. Shouldn't trigger.
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isFalse();
    }

    @Test
    void neverTriggersForFewerThanTenOccurrences() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Silence Rule Few");
        rule.setMetric(AlertMetric.PATTERN_SILENCE);
        rule.setThreshold(2.0);
        rule.setWindowSeconds(3600);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        long intervalMs = 60000L;
        Instant start = Instant.now().minusMillis(intervalMs * 15);
        for (int i = 0; i < 9; i++) {
            Timestamp t = Timestamp.from(start.plusMillis(intervalMs * i));
            logPatternRepository.recordOccurrence(org.getId(), "hash_few", "few_pattern", "sample", t);
        }

        // Even though it's been silent for ~6m, it only has 9 occurrences.
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isFalse();
    }

    @Test
    void tenantIsolation() throws Exception {
        String[] setupA = registerVerifiedAdmin();
        User userA = userRepository.findByEmail(setupA[1]).orElseThrow();
        Organization orgA = userA.getOrganization();

        String[] setupB = registerVerifiedAdmin();
        User userB = userRepository.findByEmail(setupB[1]).orElseThrow();
        Organization orgB = userB.getOrganization();

        AlertRule ruleB = new AlertRule();
        ruleB.setOrganization(orgB);
        ruleB.setName("Silence Rule B");
        ruleB.setMetric(AlertMetric.PATTERN_SILENCE);
        ruleB.setThreshold(2.0);
        ruleB.setWindowSeconds(3600);
        ruleB.setEnabled(true);
        ruleB.setCreatedAt(Timestamp.from(Instant.now()));
        ruleB.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(ruleB);

        long intervalMs = 60000L;
        Instant start = Instant.now().minusMillis(intervalMs * 15);
        for (int i = 0; i < 10; i++) {
            Timestamp t = Timestamp.from(start.plusMillis(intervalMs * i));
            logPatternRepository.recordOccurrence(orgA.getId(), "hash_orgA", "pattern_orgA", "sample", t);
        }

        // Rule B evaluated, but pattern is in Org A
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(ruleB);
        assertThat(result.triggered()).isFalse();
    }

    // returns [token, email]
    private String[] registerVerifiedAdmin() throws Exception {
        String email = "p4-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "P4-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        return new String[]{token, email};
    }
}
