package org.example.logmetricapi.consumer;

import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.LogRepository;
import org.example.logmetricapi.service.PatternRecognitionService;
import org.example.logmetricapi.service.ParameterStatsService;
import org.example.logmetricapi.service.SseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LogConsumer {

    // Named "logger" not "log" -- consumeLog(LogEntry log) already uses "log" for
    // the message parameter, and that name is far more established in this file.
    private static final Logger logger = LoggerFactory.getLogger(LogConsumer.class);

    private final LogRepository logRepository;
    private final LogPatternRepository logPatternRepository;
    private final PatternRecognitionService patternService;
    private final ParameterStatsService parameterStatsService;
    private final SseService sseService;

    public LogConsumer(LogRepository logRepository, LogPatternRepository logPatternRepository, PatternRecognitionService patternService, ParameterStatsService parameterStatsService, SseService sseService) {
        this.logRepository = logRepository;
        this.logPatternRepository = logPatternRepository;
        this.patternService = patternService;
        this.parameterStatsService = parameterStatsService;
        this.sseService = sseService;
    }

    @org.springframework.amqp.rabbit.annotation.RabbitListener(queues = "log.queue")
    public void consumeLog(LogEntry log) {
        if (log.getMessage() == null || log.getMessage().isEmpty()) {
            logger.warn("Payload rejected: blank message (org {})", log.getOrganizationId());
            return;
        }
        
        if (log.getUserId() == null || log.getUserId().isEmpty()) {
            log.setUserId("SYSTEM");
        }

        // Most producers report events, not clocks -- stamp arrival time when the
        // client didn't set one, so search sort and the histogram aggregation
        // always have a value to work with.
        if (log.getTimestamp() == null) {
            log.setTimestamp(java.time.Instant.now());
        }

        String rawMessage = log.getMessage();
        PatternRecognitionService.ParsedMessage parsed = patternService.parse(rawMessage);
        String cleansed = parsed.template();
        String hash = patternService.generateHash(cleansed);
        log.setPatternHash(hash);

        Long orgIdLong = Long.parseLong(log.getOrganizationId());
        
        java.util.List<String> params = parsed.parameters();
        for (int i = 0; i < params.size(); i++) {
            parameterStatsService.recordParamValue(orgIdLong, hash, i, params.get(i));
        }

        // Truncate defensively to 2000 chars for the pattern registry
        String safeTemplate = cleansed.length() > 2000 ? cleansed.substring(0, 2000) : cleansed;
        String safeSample = rawMessage.length() > 2000 ? rawMessage.substring(0, 2000) : rawMessage;

        logPatternRepository.recordOccurrence(
            orgIdLong,
            hash,
            safeTemplate,
            safeSample,
            java.sql.Timestamp.from(log.getTimestamp())
        );

        // Generate server-side composite ID to prevent collision
        log.setId(log.getOrganizationId() + ":" + java.util.UUID.randomUUID().toString());

        logRepository.save(log);
        sseService.broadcast(log);

        logger.debug("Successfully ingested log with hash: {}", hash);
    }
}