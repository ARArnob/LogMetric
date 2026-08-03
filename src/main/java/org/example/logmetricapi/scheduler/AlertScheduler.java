package org.example.logmetricapi.scheduler;

import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.repository.AlertRuleRepository;
import org.example.logmetricapi.service.AlertDeliveryService;
import org.example.logmetricapi.service.AlertEvaluationService;
import org.example.logmetricapi.service.AlertEvaluationService.EvaluationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Rule- and org-driven (PLAN.md T21) -- replaces the previous version, which
 * swept every organization's logs in one unscoped query and printed to
 * System.out. Each enabled AlertRule now gets its own org-scoped evaluation
 * over its own window, and an anomaly triggers real delivery (email + SSE)
 * instead of a console line.
 */
@Component
public class AlertScheduler {

    private static final Logger log = LoggerFactory.getLogger(AlertScheduler.class);

    private final AlertRuleRepository alertRuleRepository;
    private final AlertEvaluationService alertEvaluationService;
    private final AlertDeliveryService alertDeliveryService;

    public AlertScheduler(AlertRuleRepository alertRuleRepository,
                           AlertEvaluationService alertEvaluationService,
                           AlertDeliveryService alertDeliveryService) {
        this.alertRuleRepository = alertRuleRepository;
        this.alertEvaluationService = alertEvaluationService;
        this.alertDeliveryService = alertDeliveryService;
    }

    @Scheduled(fixedRate = 60000)
    public void evaluateAlertRules() {
        List<AlertRule> rules = alertRuleRepository.findByEnabledTrue();

        for (AlertRule rule : rules) {
            EvaluationResult result = alertEvaluationService.evaluate(rule);
            if (!result.triggered()) {
                continue;
            }

            boolean delivered = alertDeliveryService.deliver(rule, result.detail());
            if (delivered) {
                log.info("Alert rule '{}' (org {}) triggered: {}",
                        rule.getName(), rule.getOrganization().getId(), result.detail());
            } else {
                log.debug("Alert rule '{}' (org {}) triggered but is within its cooldown -- suppressed",
                        rule.getName(), rule.getOrganization().getId());
            }
        }
    }
}
