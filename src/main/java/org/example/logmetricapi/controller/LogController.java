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

    public LogController(org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate, 
                         ElasticsearchOperations elasticsearchOperations,
                         SseService sseService) {
        this.rabbitTemplate = rabbitTemplate;
        this.elasticsearchOperations = elasticsearchOperations;
        this.sseService = sseService;
    }

    @GetMapping(value = "/api/logs/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs() {
        return sseService.subscribe();
    }

    @PostMapping("/api/logs")
    public ResponseEntity<String> ingestLog(@RequestBody LogEntry log) {
        System.out.println(log);
        rabbitTemplate.convertAndSend("log.queue", log);
        return ResponseEntity.accepted().body("202 Accepted - Log Queued for Processing"); 
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