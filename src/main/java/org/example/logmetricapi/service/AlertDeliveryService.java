package org.example.logmetricapi.service;

import org.example.logmetricapi.dto.AlertEvent;
import org.example.logmetricapi.model.AlertRule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Delivers a triggered AlertRule exactly once per cooldown window (PLAN.md
 * T22) -- a sustained incident should page a rule's recipients once, not on
 * every 60s scheduler tick for as long as the condition holds.
 *
 * Cooldown state is a plain in-memory map, not persisted: AlertScheduler
 * evaluates rules sequentially on Spring's single-threaded @Scheduled
 * executor, so there is no concurrent access to guard against, and losing
 * this state on restart (silencing the cooldown) is an acceptable, rare
 * cost -- the alternative of over-notifying is worse.
 */
@Service
public class AlertDeliveryService {

    private final MailService mailService;
    private final SseService sseService;
    private final long cooldownMillis;

    private final Map<Long, Long> lastSentAtByRuleId = new ConcurrentHashMap<>();

    public AlertDeliveryService(MailService mailService,
                                  SseService sseService,
                                  @Value("${alert.cooldown-seconds:900}") long cooldownSeconds) {
        this.mailService = mailService;
        this.sseService = sseService;
        this.cooldownMillis = cooldownSeconds * 1000L;
    }

    /**
     * @return true if the alert was actually delivered, false if it was
     * suppressed because the rule is still within its cooldown window.
     */
    public boolean deliver(AlertRule rule, String detail) {
        long now = System.currentTimeMillis();
        Long lastSentAt = lastSentAtByRuleId.get(rule.getId());
        if (lastSentAt != null && now - lastSentAt < cooldownMillis) {
            return false;
        }
        lastSentAtByRuleId.put(rule.getId(), now);

        mailService.sendAlertNotification(rule.getTargetEmails(), rule.getName(), detail);

        AlertEvent event = new AlertEvent(
                rule.getId(), rule.getName(), rule.getMetric().name(), detail, Instant.now().toString());
        sseService.broadcastAlert(String.valueOf(rule.getOrganization().getId()), event);

        return true;
    }
}
