package org.example.logmetricapi.consumer;

import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.repository.LogRepository;
import org.example.logmetricapi.service.PatternRecognitionService;
import org.example.logmetricapi.service.SseService;
import org.springframework.stereotype.Service;

@Service
public class LogConsumer {

    private final LogRepository logRepository;
    private final PatternRecognitionService patternService;
    private final SseService sseService;

    public LogConsumer(LogRepository logRepository, PatternRecognitionService patternService, SseService sseService) {
        this.logRepository = logRepository;
        this.patternService = patternService;
        this.sseService = sseService;
    }

    @org.springframework.amqp.rabbit.annotation.RabbitListener(queues = "log.queue")
    public void consumeLog(LogEntry log) {
        if (log.getMessage() == null || log.getMessage().isEmpty()) {
            System.out.println("Payload rejected");
            return;
        }
        
        if (log.getUserId() == null || log.getUserId().isEmpty()) {
            log.setUserId("SYSTEM");
        }

        String rawMessage = log.getMessage();
        String cleansed = patternService.cleanser(rawMessage);
        String hash = patternService.generateHash(cleansed);
        log.setPatternHash(hash);

        // Generate server-side composite ID to prevent collision
        log.setId(log.getOrganizationId() + ":" + java.util.UUID.randomUUID().toString());

        logRepository.save(log);
        sseService.broadcast(log);

        System.out.println("Successfully ingested log with hash: " + hash);
    }
}