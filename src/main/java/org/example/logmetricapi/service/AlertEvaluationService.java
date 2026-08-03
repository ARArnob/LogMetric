package org.example.logmetricapi.service;

import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.aggregations.TermsAggregation;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.model.LogEntry;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Evaluates a single org-scoped AlertRule over its own window (PLAN.md T21).
 * Split out of AlertScheduler so the scheduler's job is purely "iterate
 * enabled rules and hand each to this" -- the ES query building and the
 * per-metric evaluation logic live here.
 */
@Service
public class AlertEvaluationService {

    // Bounded fetch for ENTROPY, which needs actual message text (aggregations
    // only give counts). A rule's window can span far longer than the 60s poll
    // interval, so this caps the per-evaluation cost rather than fetching every
    // matching document -- a deliberate tradeoff, not an oversight.
    private static final int MAX_HITS_FOR_ENTROPY_SCAN = 1000;

    private final ElasticsearchOperations elasticsearchOperations;
    private final LogAnalyticsService logAnalyticsService;

    public AlertEvaluationService(ElasticsearchOperations elasticsearchOperations,
                                    LogAnalyticsService logAnalyticsService) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.logAnalyticsService = logAnalyticsService;
    }

    public record EvaluationResult(boolean triggered, String detail) {
        static EvaluationResult notTriggered() {
            return new EvaluationResult(false, null);
        }
    }

    public EvaluationResult evaluate(AlertRule rule) {
        Long orgId = rule.getOrganization().getId();
        long now = System.currentTimeMillis();
        long windowStart = now - rule.getWindowSeconds() * 1000L;

        BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();
        boolQueryBuilder.filter(f -> f.term(t -> t.field("organizationId").value(String.valueOf(orgId))));
        boolQueryBuilder.filter(f -> f.range(r -> r.untyped(u -> u.field("timestamp")
                .gte(JsonData.of(windowStart))
                .lte(JsonData.of(now)))));

        Query query = Query.of(q -> q.bool(boolQueryBuilder.build()));

        Aggregation severityAgg = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("level"))));
        Aggregation serviceAgg = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("serviceName").size(100))));

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .withAggregation("severity", severityAgg)
                .withAggregation("services", serviceAgg)
                .withPageable(PageRequest.of(0, MAX_HITS_FOR_ENTROPY_SCAN))
                .build();

        SearchHits<LogEntry> hits = elasticsearchOperations.search(nativeQuery, LogEntry.class);
        long total = hits.getTotalHits();

        return switch (rule.getMetric()) {
            case ERROR_RATE -> evaluateErrorRate(rule, hits, total);
            case VOLUME_ZSCORE -> evaluateVolumeZScore(rule, orgId, hits);
            case ENTROPY -> evaluateEntropy(rule, hits);
        };
    }

    private EvaluationResult evaluateErrorRate(AlertRule rule, SearchHits<LogEntry> hits, long total) {
        Map<String, Long> byLevel = parseTermsBuckets(hits, "severity");
        long errorCount = byLevel.getOrDefault("ERROR", 0L);
        double rate = total == 0 ? 0.0 : (double) errorCount / total;

        if (rate > rule.getThreshold()) {
            String detail = String.format(
                    "Error rate %.1f%% over the last %ds (%d of %d logs) exceeds threshold %.1f%%",
                    rate * 100, rule.getWindowSeconds(), errorCount, total, rule.getThreshold() * 100);
            return new EvaluationResult(true, detail);
        }
        return EvaluationResult.notTriggered();
    }

    /**
     * Per-service, not per-org: the original console-only scheduler broke
     * traffic down by service and flagged any service whose volume deviated
     * from its own EMA baseline. That per-service breakdown is preserved --
     * only the EMA key changes, from bare serviceName to "orgId:serviceName",
     * so org A's checkout-service baseline can't be skewed by org B's traffic
     * on a service with the same name (PLAN.md T21's explicit note).
     */
    private EvaluationResult evaluateVolumeZScore(AlertRule rule, Long orgId, SearchHits<LogEntry> hits) {
        Map<String, Long> byService = parseTermsBuckets(hits, "services");

        for (Map.Entry<String, Long> entry : byService.entrySet()) {
            String serviceName = entry.getKey();
            long count = entry.getValue();
            String emaKey = orgId + ":" + serviceName;

            double zScore = logAnalyticsService.calculateDynamicZScore(emaKey, count);
            if (logAnalyticsService.isTrafficAnomalous(zScore, rule.getThreshold())) {
                String detail = String.format(
                        "Volume z-score %.2f for service '%s' (%d events in the last %ds) exceeds threshold %.2f",
                        zScore, serviceName, count, rule.getWindowSeconds(), rule.getThreshold());
                return new EvaluationResult(true, detail);
            }
        }
        return EvaluationResult.notTriggered();
    }

    private EvaluationResult evaluateEntropy(AlertRule rule, SearchHits<LogEntry> hits) {
        for (var searchHit : hits.getSearchHits()) {
            LogEntry log = searchHit.getContent();
            if (log.getMessage() == null) {
                continue;
            }
            double entropy = logAnalyticsService.calculateMaxWindowEntropy(log.getMessage());
            if (logAnalyticsService.isPayloadObfuscated(log.getMessage(), rule.getThreshold())) {
                String detail = String.format(
                        "Payload entropy %.2f in service '%s' exceeds threshold %.2f (log id %s)",
                        entropy, log.getServiceName(), rule.getThreshold(), log.getId());
                return new EvaluationResult(true, detail);
            }
        }
        return EvaluationResult.notTriggered();
    }

    private Map<String, Long> parseTermsBuckets(SearchHits<LogEntry> hits, String aggregationName) {
        Map<String, Long> result = new HashMap<>();
        if (hits.getAggregations() == null) {
            return result;
        }
        ElasticsearchAggregations aggregations = (ElasticsearchAggregations) hits.getAggregations();
        ElasticsearchAggregation aggregation =
                (ElasticsearchAggregation) aggregations.aggregationsAsMap().get(aggregationName);
        var aggregate = aggregation != null ? aggregation.aggregation().getAggregate() : null;

        if (aggregate != null && aggregate.isSterms()) {
            aggregate.sterms().buckets().array().forEach(bucket ->
                    result.put(bucket.key().stringValue(), bucket.docCount()));
        }
        return result;
    }
}
