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
class NewPatternAlertTests {

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
    void ruleFiresWhenNewPatternInsideWindow() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Test Rule");
        rule.setMetric(AlertMetric.NEW_PATTERN);
        rule.setThreshold(1.0);
        rule.setWindowSeconds(3600);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        Timestamp now = Timestamp.from(Instant.now());
        logPatternRepository.recordOccurrence(org.getId(), "hash1", "template1", "sample1", now);

        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isTrue();
        assertThat(result.detail()).contains("1 new pattern detected");
        assertThat(result.detail()).contains("'template1'");
    }

    @Test
    void ruleDoesNotFireWhenPatternOlderThanWindow() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Test Rule");
        rule.setMetric(AlertMetric.NEW_PATTERN);
        rule.setThreshold(1.0);
        rule.setWindowSeconds(60);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        Timestamp oldTime = Timestamp.from(Instant.now().minusSeconds(120));
        logPatternRepository.recordOccurrence(org.getId(), "hash1", "template1", "sample1", oldTime);

        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isFalse();
    }

    @Test
    void ruleRespectsThreshold() throws Exception {
        String[] setup = registerVerifiedAdmin();
        User user = userRepository.findByEmail(setup[1]).orElseThrow();
        Organization org = user.getOrganization();

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        rule.setName("Test Rule");
        rule.setMetric(AlertMetric.NEW_PATTERN);
        rule.setThreshold(3.0);
        rule.setWindowSeconds(3600);
        rule.setEnabled(true);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        rule.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(rule);

        Timestamp now = Timestamp.from(Instant.now());
        logPatternRepository.recordOccurrence(org.getId(), "hash1", "template1", "sample1", now);
        logPatternRepository.recordOccurrence(org.getId(), "hash2", "template2", "sample2", now);

        AlertEvaluationService.EvaluationResult result1 = alertEvaluationService.evaluate(rule);
        assertThat(result1.triggered()).isFalse();

        logPatternRepository.recordOccurrence(org.getId(), "hash3", "template3", "sample3", now);
        AlertEvaluationService.EvaluationResult result2 = alertEvaluationService.evaluate(rule);
        assertThat(result2.triggered()).isTrue();
        assertThat(result2.detail()).contains("3 new patterns detected");
    }

    @Test
    void newPatternInOrgANeverTriggersOrgBRule() throws Exception {
        String[] setupA = registerVerifiedAdmin();
        User userA = userRepository.findByEmail(setupA[1]).orElseThrow();
        Organization orgA = userA.getOrganization();

        String[] setupB = registerVerifiedAdmin();
        User userB = userRepository.findByEmail(setupB[1]).orElseThrow();
        Organization orgB = userB.getOrganization();

        AlertRule ruleB = new AlertRule();
        ruleB.setOrganization(orgB);
        ruleB.setName("Test Rule B");
        ruleB.setMetric(AlertMetric.NEW_PATTERN);
        ruleB.setThreshold(1.0);
        ruleB.setWindowSeconds(3600);
        ruleB.setEnabled(true);
        ruleB.setCreatedAt(Timestamp.from(Instant.now()));
        ruleB.setTargetEmails(Set.of("admin@test.local"));
        alertRuleRepository.save(ruleB);

        Timestamp now = Timestamp.from(Instant.now());
        logPatternRepository.recordOccurrence(orgA.getId(), "hash1", "template1", "sample1", now);

        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(ruleB);
        assertThat(result.triggered()).isFalse();
    }

    // returns [token, email]
    private String[] registerVerifiedAdmin() throws Exception {
        String email = "p2-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "P2-Org-" + UUID.randomUUID()))))
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
