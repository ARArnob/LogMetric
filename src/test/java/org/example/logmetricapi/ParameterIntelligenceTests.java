package org.example.logmetricapi;

import org.example.logmetricapi.model.AlertMetric;
import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.PatternParamWindow;
import org.example.logmetricapi.repository.AlertRuleRepository;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.PatternParamWindowRepository;
import org.example.logmetricapi.service.AlertEvaluationService;
import org.example.logmetricapi.service.ParameterStatsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ParameterIntelligenceTests {

    @Autowired
    private ParameterStatsService parameterStatsService;

    @Autowired
    private PatternParamWindowRepository windowRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private LogPatternRepository logPatternRepository;

    @Autowired
    private AlertEvaluationService alertEvaluationService;
    
    @Autowired
    private AlertRuleRepository alertRuleRepository;

    private Organization org1;
    private Organization org2;
    private AlertRule rule;

    @BeforeEach
    void setup() {
        org1 = new Organization();
        org1.setName("Org 1");
        org1 = organizationRepository.save(org1);

        org2 = new Organization();
        org2.setName("Org 2");
        org2 = organizationRepository.save(org2);

        rule = new AlertRule();
        rule.setOrganization(org1);
        rule.setName("Cardinality test");
        rule.setMetric(AlertMetric.PARAM_CARDINALITY);
        rule.setThreshold(3.0);
        rule.setWindowSeconds(300);
        rule.setEnabled(true);
        rule.setCreatedAt(new Timestamp(System.currentTimeMillis()));
        rule = alertRuleRepository.save(rule);
        
        LogPattern pattern = new LogPattern();
        pattern.setOrganization(org1);
        pattern.setPatternHash("testhash");
        pattern.setTemplate("User {NUM} logged in");
        pattern.setSampleMessage("User 123 logged in");
        pattern.setFirstSeen(new Timestamp(System.currentTimeMillis()));
        pattern.setLastSeen(new Timestamp(System.currentTimeMillis()));
        pattern.setOccurrenceCount(10L);
        logPatternRepository.save(pattern);
    }

    @AfterEach
    void cleanup() {
        parameterStatsService.flushNow(); // Clear out any dangling state
    }

    @Test
    void testRecordAndFlushExactCounts() {
        parameterStatsService.recordParamValue(org1.getId(), "hash1", 0, "val1");
        parameterStatsService.recordParamValue(org1.getId(), "hash1", 0, "val2");
        parameterStatsService.recordParamValue(org1.getId(), "hash1", 0, "val3");
        
        parameterStatsService.flushNow();

        List<PatternParamWindow> windows = windowRepository.findAll();
        assertThat(windows).hasSize(1);
        PatternParamWindow w = windows.get(0);
        assertThat(w.getPatternHash()).isEqualTo("hash1");
        assertThat(w.getDistinctCount()).isEqualTo(3);
        assertThat(w.getTotalCount()).isEqualTo(3);
    }

    @Test
    void testTotalCountIncreasesButDistinctDoesNot() {
        for (int i = 0; i < 10; i++) {
            parameterStatsService.recordParamValue(org1.getId(), "hash2", 0, "sameVal");
        }
        
        parameterStatsService.flushNow();

        List<PatternParamWindow> windows = windowRepository.findAll();
        assertThat(windows).hasSize(1);
        PatternParamWindow w = windows.get(0);
        assertThat(w.getDistinctCount()).isEqualTo(1);
        assertThat(w.getTotalCount()).isEqualTo(10);
    }

    @Test
    void testMemoryCapsEnforcedAndOrgIsolated() {
        // Exceed distinct limit (5000)
        for (int i = 0; i < 5500; i++) {
            parameterStatsService.recordParamValue(org1.getId(), "hash_distinct", 0, "val" + i);
        }
        
        // Exceed max keys for org1 (200)
        for (int i = 0; i < 250; i++) {
            parameterStatsService.recordParamValue(org1.getId(), "hash_keys_" + i, 0, "val");
        }
        
        // Org2 should still be able to add keys despite org1 hitting the cap
        parameterStatsService.recordParamValue(org2.getId(), "hash_org2", 0, "val");
        
        parameterStatsService.flushNow();

        List<PatternParamWindow> windows = windowRepository.findAll();
        
        PatternParamWindow distinctWindow = windows.stream()
                .filter(w -> w.getPatternHash().equals("hash_distinct"))
                .findFirst().orElseThrow();
        
        assertThat(distinctWindow.getDistinctCount()).isEqualTo(5000); // capped
        assertThat(distinctWindow.getTotalCount()).isEqualTo(5500); // exact
        
        long org1Keys = windows.stream().filter(w -> w.getOrganization().getId().equals(org1.getId())).count();
        assertThat(org1Keys).isEqualTo(200); // Capped at 200 per org
        
        long org2Keys = windows.stream().filter(w -> w.getOrganization().getId().equals(org2.getId())).count();
        assertThat(org2Keys).isEqualTo(1); // Not starved
    }

    @Test
    void testAlertDoesNotFireOnColdStart() {
        // Only 3 previous windows
        long now = System.currentTimeMillis();
        for (int i = 0; i < 4; i++) {
            PatternParamWindow w = new PatternParamWindow(org1, "testhash", 0, 
                new Timestamp(now - (5-i)*300000), 
                new Timestamp(now - (4-i)*300000), 
                100, 100);
            windowRepository.save(w);
        }
        
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isFalse();
    }

    @Test
    void testAlertFiresCorrectlyOnCardinalitySpike() {
        long now = System.currentTimeMillis();
        // 6 prior windows with distinct count 10
        for (int i = 0; i < 6; i++) {
            PatternParamWindow w = new PatternParamWindow(org1, "testhash", 0, 
                new Timestamp(now - (7-i)*300000), 
                new Timestamp(now - (6-i)*300000), 
                10, 10);
            windowRepository.save(w);
        }
        // 1 latest window with distinct count 50 (5x spike, threshold is 3x)
        PatternParamWindow latest = new PatternParamWindow(org1, "testhash", 0, 
            new Timestamp(now - 300000), 
            new Timestamp(now), 
            50, 50);
        windowRepository.save(latest);
        
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isTrue();
        assertThat(result.detail()).contains("Parameter 1 in 'User {NUM} logged in' distinct count 50 exceeds threshold 3.0 * mean 10.0");
    }

    @Test
    void testAlertDoesNotFireOnVolumeSpikeWithoutCardinalitySpike() {
        long now = System.currentTimeMillis();
        // 6 prior windows with distinct count 10, total count 10
        for (int i = 0; i < 6; i++) {
            PatternParamWindow w = new PatternParamWindow(org1, "testhash", 0, 
                new Timestamp(now - (7-i)*300000), 
                new Timestamp(now - (6-i)*300000), 
                10, 10);
            windowRepository.save(w);
        }
        // 1 latest window with distinct count 12, total count 1000 (huge volume spike, but cardinality flat)
        PatternParamWindow latest = new PatternParamWindow(org1, "testhash", 0, 
            new Timestamp(now - 300000), 
            new Timestamp(now), 
            12, 1000);
        windowRepository.save(latest);
        
        AlertEvaluationService.EvaluationResult result = alertEvaluationService.evaluate(rule);
        assertThat(result.triggered()).isFalse();
    }
}
