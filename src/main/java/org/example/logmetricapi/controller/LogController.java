package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.LogSearchRequest;
import org.example.logmetricapi.dto.LogSearchResponse;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.service.LogSearchService;
import org.example.logmetricapi.service.SseService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class LogController {
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
    public ResponseEntity<String> ingestLog(@RequestBody LogEntry log) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.setOrganizationId(AuthUtils.requireOrganizationIdAsString(authentication));
        // Overwrite whatever systemId the client sent -- it must come from the
        // authenticated API-key principal, never the request body (T11).
        Long systemId = AuthUtils.requireSystemId(authentication);
        log.setSystemId(systemId != null ? String.valueOf(systemId) : null);

        System.out.println(log);
        rabbitTemplate.convertAndSend("log.queue", log);
        return ResponseEntity.accepted().body("202 Accepted - Log Queued for Processing");
    }

    @PostMapping("/api/logs/search")
    public ResponseEntity<LogSearchResponse> searchLogsApi(@RequestBody LogSearchRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String organizationId = AuthUtils.requireOrganizationIdAsString(authentication);

        LogSearchResponse response = logSearchService.searchLogs(request, organizationId);
        return ResponseEntity.ok(response);
    }
}
