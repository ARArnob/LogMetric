package org.example.logmetricapi.consumer;

import org.example.logmetricapi.service.PatternRecognitionService;
import org.example.logmetricapi.service.LogAnalyticsService; // Injecting the math
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.repository.LogRepository;
import org.springframework.stereotype.Service;

@Service
public class LogConsumer {

    private final LogRepository logRepository;
    private final PatternRecognitionService patternService;
    private final LogAnalyticsService logAnalyticsService; // Declare new service

    public LogConsumer(LogRepository logRepository, PatternRecognitionService patternService, LogAnalyticsService logAnalyticsService) {
        this.logRepository = logRepository;
        this.patternService = patternService;
        this.logAnalyticsService = logAnalyticsService;
    }

    @org.springframework.amqp.rabbit.annotation.RabbitListener(queues = "log.queue")
    public void consumeLog(LogEntry log) {
        if (log.getMessage() == null || log.getMessage().isEmpty()) {
            System.out.println("Payload rejected: Missing message");
            return;
        }
        if (log.getUserId() == null || log.getUserId().isEmpty()) {
            log.setUserId("SYSTEM");
        }

        String rawMessage = log.getMessage();
        String cleansed = patternService.cleanser(rawMessage);
        String hash = patternService.generateHash(cleansed);
        log.setPatternHash(hash);

        long[] historicalBaseline = {12, 14, 11, 15, 13, 12, 14, 11, 15, 12};

        long currentTraffic = (rawMessage.contains("DDoS")) ? 150 : 13;

        double zScore = logAnalyticsService.calculateZScore(currentTraffic, historicalBaseline);

        if (zScore > 3.0) {

            System.out.println("🚨 ANOMALY DETECTED! Z-Score: " + String.format("%.2f", zScore) + " | Hash: " + hash);
        } else {
            System.out.println("✅ Log Ingested Normal. Z-Score: " + String.format("%.2f", zScore));
        }

        logRepository.save(log);
    }
}