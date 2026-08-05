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
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.model.LogPattern;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;
import org.example.logmetricapi.repository.PatternParamWindowRepository;
import org.example.logmetricapi.model.PatternParamWindow;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.sql.Timestamp;
import java.util.stream.Collectors;

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
    private final LogPatternRepository logPatternRepository;
    private final PatternParamWindowRepository patternParamWindowRepository;

    public AlertEvaluationService(ElasticsearchOperations elasticsearchOperations,
                                    LogAnalyticsService logAnalyticsService,
                                    LogPatternRepository logPatternRepository,
                                    PatternParamWindowRepository patternParamWindowRepository) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.logAnalyticsService = logAnalyticsService;
        this.logPatternRepository = logPatternRepository;
        this.patternParamWindowRepository = patternParamWindowRepository;
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
            case NEW_PATTERN -> evaluateNewPattern(rule, orgId, windowStart);
            case PATTERN_SILENCE -> evaluatePatternSilence(rule, orgId, now);
            case PARAM_CARDINALITY -> evaluateParamCardinality(rule, orgId, now);
        };
    }

    private EvaluationResult evaluatePatternSilence(AlertRule rule, Long orgId, long now) {
        // Only consider patterns with an established cadence to avoid paging on one-off logs
        long minOccurrences = 10L;
        List<LogPattern> patterns = logPatternRepository.findByOrganizationIdAndOccurrenceCountGreaterThanEqual(orgId, minOccurrences);
        for (LogPattern pattern : patterns) {
            long firstSeen = pattern.getFirstSeen().getTime();
            long lastSeen = pattern.getLastSeen().getTime();
            long count = pattern.getOccurrenceCount();
            
            // avgIntervalMs = (lastSeen - firstSeen) / (occurrenceCount - 1)
            long avgIntervalMs = (lastSeen - firstSeen) / (count - 1);
            long silentForMs = now - lastSeen;
            
            // Skip patterns where avgIntervalMs is 0 or pattern is younger than threshold * avgInterval
            // Note: A mean interval is a crude cadence model and will misjudge bursty patterns. 
            // It is deliberately simple; a proper fix is interval variance or a histogram.
            if (avgIntervalMs <= 0 || (lastSeen - firstSeen) < rule.getThreshold() * avgIntervalMs) {
                continue;
            }
            
            if (silentForMs > rule.getThreshold() * avgIntervalMs) {
                String detail = String.format(
                        "Pattern '%s' has been silent for %d ms (threshold %.1f * avg interval %d ms)",
                        pattern.getTemplate(), silentForMs, rule.getThreshold(), avgIntervalMs);
                return new EvaluationResult(true, detail);
            }
        }
        return EvaluationResult.notTriggered();
    }

    private EvaluationResult evaluateNewPattern(AlertRule rule, Long orgId, long windowStart) {
        List<LogPattern> newPatterns = logPatternRepository.findByOrganizationIdAndFirstSeenAfter(orgId, new Timestamp(windowStart));
        int count = newPatterns.size();
        int threshold = (int) rule.getThreshold();
        
        if (count >= threshold) {
            StringBuilder sb = new StringBuilder();
            int limit = Math.min(count, 3);
            for (int i = 0; i < limit; i++) {
                if (i > 0) sb.append(", ");
                sb.append("'").append(newPatterns.get(i).getTemplate()).append("'");
            }
            if (count > limit) {
                sb.append(" and ").append(count - limit).append(" more");
            }
            String patternWord = count == 1 ? "pattern" : "patterns";
            String detail = String.format("%d new %s detected: %s", count, patternWord, sb.toString());
            return new EvaluationResult(true, detail);
        }
        return EvaluationResult.notTriggered();
    }

    private EvaluationResult evaluateParamCardinality(AlertRule rule, Long orgId, long now) {
        // We need 7 windows (6 prior + 1 latest). 5 minutes per window = 35 minutes.
        // Add a 5-minute buffer to ensure we don't miss the 7th window due to millisecond jitter.
        long fortyMinsAgo = now - 40 * 60 * 1000L;
        
        List<PatternParamWindow> recentWindows = patternParamWindowRepository
                .findByOrganizationIdAndWindowStartGreaterThanEqualOrderByWindowStartDesc(orgId, new Timestamp(fortyMinsAgo));
        
        // Group by (patternHash, paramIndex)
        record GroupKey(String patternHash, int paramIndex) {}
        Map<GroupKey, List<PatternParamWindow>> grouped = recentWindows.stream()
                .collect(Collectors.groupingBy(w -> new GroupKey(w.getPatternHash(), w.getParamIndex())));
                
        for (Map.Entry<GroupKey, List<PatternParamWindow>> entry : grouped.entrySet()) {
            GroupKey key = entry.getKey();
            List<PatternParamWindow> windows = entry.getValue();
            // Windows are fetched ordered by windowStart DESC, so index 0 is the most recent.
            // Note: Since flush doesn't guarantee strict timing if delayed, we should sort just in case:
            windows.sort((w1, w2) -> w2.getWindowStart().compareTo(w1.getWindowStart()));
            
            PatternParamWindow latest = windows.get(0);
            
            // If the latest window ended more than 10 minutes ago, it's not a "current" spike
            if (now - latest.getWindowEnd().getTime() > 10 * 60 * 1000L) {
                continue;
            }
            
            // Get the prior windows (up to 6)
            List<PatternParamWindow> priorWindows = windows.subList(1, windows.size());
            
            if (priorWindows.size() < 6) {
                // Skip cold start
                continue;
            }
            
            // Limit to exactly 6 prior windows in case we fetched more
            priorWindows = priorWindows.subList(0, 6);
            
            double sumDistinct = 0;
            for (PatternParamWindow prior : priorWindows) {
                sumDistinct += prior.getDistinctCount();
            }
            double meanDistinct = sumDistinct / 6.0;
            
            if (latest.getDistinctCount() > rule.getThreshold() * meanDistinct) {
                String template = logPatternRepository.findByOrganizationIdAndPatternHash(orgId, key.patternHash())
                        .map(LogPattern::getTemplate)
                        .orElse(key.patternHash());
                        
                String detail = String.format(
                        "Parameter %d in '%s' distinct count %d exceeds threshold %.1f * mean %.1f",
                        key.paramIndex() + 1, template, latest.getDistinctCount(), rule.getThreshold(), meanDistinct);
                return new EvaluationResult(true, detail);
            }
        }
        
        return EvaluationResult.notTriggered();
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
