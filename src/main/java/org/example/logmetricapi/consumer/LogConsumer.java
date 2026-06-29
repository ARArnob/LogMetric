package org.example.logmetricapi.consumer;

import org.example.logmetricapi.service.PatternRecognitionService;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.repository.LogRepository;
import org.springframework.stereotype.Service;

@Service
public class LogConsumer {

    private final LogRepository logRepository;
    private final PatternRecognitionService patternService;
    public LogConsumer(LogRepository logRepository,  PatternRecognitionService patternService) {
        this.logRepository = logRepository;
        this.patternService = patternService;
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
        logRepository.save(log);
    }
}
