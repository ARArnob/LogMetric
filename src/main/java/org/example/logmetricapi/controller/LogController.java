package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.LogIngestRequest;
import org.example.logmetricapi.dto.LogSearchRequest;
import org.example.logmetricapi.dto.LogSearchResponse;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.service.LogSearchService;
import org.example.logmetricapi.service.SseService;
import org.example.logmetricapi.util.AuthUtils;
import jakarta.validation.Valid;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Locale;
import java.util.Set;

@RestController
public class LogController {

    // S4 (SECURITY-TODO.md): the only levels the frontend's severity legend
    // (logmetric-ui/app/lib/severity.ts) knows how to render distinctly.
    private static final Set<String> VALID_LEVELS = Set.of("ERROR", "WARN", "INFO", "DEBUG");

    private final RabbitTemplate rabbitTemplate;
    private final SseService sseService;
    private final LogSearchService logSearchService;

    public LogController(RabbitTemplate rabbitTemplate,
                          SseService sseService,
                          LogSearchService logSearchService) {
        this.rabbitTemplate = rabbitTemplate;
        this.sseService = sseService;
        this.logSearchService = logSearchService;
    }

    @GetMapping(value = "/api/logs/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String organizationId = AuthUtils.requireOrganizationIdAsString(authentication);
        return sseService.subscribe(organizationId);
    }

    @PostMapping("/api/logs")
    public ResponseEntity<String> ingestLog(@Valid @RequestBody LogIngestRequest request) {
        String normalizedLevel = request.getLevel().toUpperCase(Locale.ROOT);
        if (!VALID_LEVELS.contains(normalizedLevel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "level must be one of " + VALID_LEVELS + " (case-insensitive), got: " + request.getLevel());
        }

        LogEntry log = new LogEntry(null, request.getTimestamp(), normalizedLevel, request.getServiceName(),
                null, request.getMessage(), request.getUserId(), null, null);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.setOrganizationId(AuthUtils.requireOrganizationIdAsString(authentication));
        // Overwrite whatever systemId the client sent -- it must come from the
        // authenticated API-key principal, never the request body (T11).
        Long systemId = AuthUtils.requireSystemId(authentication);
        log.setSystemId(systemId != null ? String.valueOf(systemId) : null);

        rabbitTemplate.convertAndSend("log.queue", log);
        return ResponseEntity.accepted().body("202 Accepted - Log Queued for Processing");
    }

    @PostMapping("/api/logs/search")
    public ResponseEntity<LogSearchResponse> searchLogsApi(@Valid @RequestBody LogSearchRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String organizationId = AuthUtils.requireOrganizationIdAsString(authentication);

        LogSearchResponse response = logSearchService.searchLogs(request, organizationId);
        return ResponseEntity.ok(response);
    }
}
