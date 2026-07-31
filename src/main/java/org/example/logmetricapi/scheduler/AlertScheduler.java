package org.example.logmetricapi.scheduler;

import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.service.LogAnalyticsService;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class AlertScheduler {

    private final ElasticsearchOperations elasticsearchOperations;
    private final LogAnalyticsService logAnalyticsService;

    public AlertScheduler(ElasticsearchOperations elasticsearchOperations, 
                          LogAnalyticsService logAnalyticsService) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.logAnalyticsService = logAnalyticsService;
    }

    @Scheduled(fixedRate = 60000)
    public void evaluateTrafficAnomalies() {
        long now = System.currentTimeMillis();
        long sixtySecondsAgo = now - 60000;

        Criteria criteria = new Criteria("timestamp").between(sixtySecondsAgo, now);
        CriteriaQuery query = new CriteriaQuery(criteria);
        
        query.setMaxResults(10000);

        SearchHits<LogEntry> searchHits = elasticsearchOperations.search(query, LogEntry.class);
        
        List<LogEntry> logs = searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .collect(Collectors.toList());

        Map<String, Long> serviceCounts = logs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getServiceName() != null ? log.getServiceName() : "UNKNOWN_SERVICE",
                        Collectors.counting()
                ));

        System.out.println("--- Traffic Check ---");

        for (Map.Entry<String, Long> entry : serviceCounts.entrySet()) {
            String serviceName = entry.getKey();
            long count = entry.getValue();

            double zScore = logAnalyticsService.calculateDynamicZScore(serviceName, count);
            boolean isAnomalous = logAnalyticsService.isTrafficAnomalous(zScore);

            System.out.println("Service: " + serviceName + " | Log Count: " + count + " | Z-Score: " + String.format("%.2f", zScore));

            if (isAnomalous) {
                System.out.println("🚨 URGENT: Volumetric Traffic Anomaly Detected for service: " + serviceName + "!");
            }
        }

        for (LogEntry log : logs) {
            if (log.getMessage() != null && logAnalyticsService.isPayloadObfuscated(log.getMessage())) {
                System.out.println("🚨 SEMANTIC ANOMALY DETECTED | Log ID: " + log.getId());
            }
        }
        
        System.out.println("---------------------");
    }
}