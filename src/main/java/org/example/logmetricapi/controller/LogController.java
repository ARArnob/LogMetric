package org.example.logmetricapi.controller;

import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.service.SseService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.stream.Collectors;

@RestController
public class LogController {
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    private final ElasticsearchOperations elasticsearchOperations;
    private final SseService sseService;
    private final org.example.logmetricapi.service.LogSearchService logSearchService;

    public LogController(org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate, 
                         ElasticsearchOperations elasticsearchOperations,
                         SseService sseService,
                         org.example.logmetricapi.service.LogSearchService logSearchService) {
        this.rabbitTemplate = rabbitTemplate;
        this.elasticsearchOperations = elasticsearchOperations;
        this.sseService = sseService;
        this.logSearchService = logSearchService;
    }

    @GetMapping(value = "/api/logs/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs() {
        return sseService.subscribe();
    }

    @PostMapping("/api/logs")
    public ResponseEntity<String> ingestLog(@RequestBody LogEntry log) {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof org.example.logmetricapi.model.Organization) {
            org.example.logmetricapi.model.Organization org = (org.example.logmetricapi.model.Organization) authentication.getPrincipal();
            log.setOrganizationId(String.valueOf(org.getId()));
        } else {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("401 Unauthorized - Invalid Organization Context");
        }

        System.out.println(log);
        rabbitTemplate.convertAndSend("log.queue", log);
        return ResponseEntity.accepted().body("202 Accepted - Log Queued for Processing"); 
    }

    @PostMapping("/api/logs/search")
    public ResponseEntity<org.example.logmetricapi.dto.LogSearchResponse> searchLogsApi(@RequestBody org.example.logmetricapi.dto.LogSearchRequest request) {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        // TODO: Extract organizationId dynamically from authentication.getName() or principal.
        // This relies on the upcoming JWT filter chain to populate the SecurityContext.
        String orgId = "tenant-1"; // Temporary hardcoded fallback for testing
        
        if (authentication != null && authentication.getName() != null && !authentication.getName().equals("anonymousUser")) {
            orgId = authentication.getName();
        }
        
        org.example.logmetricapi.dto.LogSearchResponse response = logSearchService.searchLogs(request, orgId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/logs")
    public ResponseEntity<?> searchLogs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) Long startDate,
            @RequestParam(required = false) Long endDate) {

        Criteria criteria = null;

        if (keyword != null && !keyword.trim().isEmpty()) {
            criteria = new Criteria("message").contains(keyword);
        }
        if (level != null && !level.trim().isEmpty()) {
            criteria = (criteria == null) ? new Criteria("level").is(level) : criteria.and("level").is(level);
        }
        if (serviceName != null && !serviceName.trim().isEmpty()) {
            criteria = (criteria == null) ? new Criteria("serviceName").is(serviceName) : criteria.and("serviceName").is(serviceName);
        }
        if (startDate != null) {
            criteria = (criteria == null) ? new Criteria("timestamp").greaterThanEqual(startDate) : criteria.and("timestamp").greaterThanEqual(startDate);
        }
        if (endDate != null) {
            criteria = (criteria == null) ? new Criteria("timestamp").lessThanEqual(endDate) : criteria.and("timestamp").lessThanEqual(endDate);
        }

        if (criteria == null) {
            criteria = new Criteria();
        }

        CriteriaQuery query = new CriteriaQuery(criteria);
        SearchHits<LogEntry> searchHits = elasticsearchOperations.search(query, LogEntry.class);

        List<LogEntry> logs = searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .collect(Collectors.toList());

        return ResponseEntity.ok(logs);
    }
}