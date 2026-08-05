package org.example.logmetricapi.service;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.aggregations.CalendarInterval;
import co.elastic.clients.elasticsearch._types.aggregations.DateHistogramAggregation;
import co.elastic.clients.elasticsearch._types.aggregations.TermsAggregation;
import co.elastic.clients.elasticsearch._types.aggregations.TopHitsAggregation;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import org.example.logmetricapi.dto.LogSearchRequest;
import org.example.logmetricapi.dto.LogSearchResponse;
import org.example.logmetricapi.model.LogEntry;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;

import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LogSearchService {

    private final ElasticsearchOperations elasticsearchOperations;
    private final LogPatternRepository logPatternRepository;

    public LogSearchService(ElasticsearchOperations elasticsearchOperations, LogPatternRepository logPatternRepository) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.logPatternRepository = logPatternRepository;
    }

    public LogSearchResponse searchLogs(LogSearchRequest request, String organizationId) {
        BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();

        boolQueryBuilder.filter(f -> f.term(t -> t.field("organizationId").value(organizationId)));

        if (request.getSystemId() != null && !request.getSystemId().trim().isEmpty()) {
            boolQueryBuilder.filter(f -> f.term(t -> t.field("systemId").value(request.getSystemId())));
        }
        if (request.getPatternHash() != null && !request.getPatternHash().trim().isEmpty()) {
            boolQueryBuilder.filter(f -> f.term(t -> t.field("patternHash").value(request.getPatternHash())));
        }
        if (request.getStartDate() != null || request.getEndDate() != null) {
            boolQueryBuilder.filter(f -> f.range(r -> r.untyped(u -> {
                u.field("timestamp");
                if (request.getStartDate() != null) {
                    u.gte(JsonData.of(request.getStartDate()));
                }
                if (request.getEndDate() != null) {
                    u.lte(JsonData.of(request.getEndDate()));
                }
                return u;
            })));
        }

        if (request.getLevels() != null && !request.getLevels().isEmpty()) {
            List<co.elastic.clients.elasticsearch._types.FieldValue> levelValues = request.getLevels().stream()
                    .map(co.elastic.clients.elasticsearch._types.FieldValue::of)
                    .collect(Collectors.toList());
            boolQueryBuilder.filter(f -> f.terms(t -> t.field("level").terms(ts -> ts.value(levelValues))));
        }

        if (request.getServiceNames() != null && !request.getServiceNames().isEmpty()) {
            List<co.elastic.clients.elasticsearch._types.FieldValue> serviceValues = request.getServiceNames().stream()
                    .map(co.elastic.clients.elasticsearch._types.FieldValue::of)
                    .collect(Collectors.toList());
            boolQueryBuilder.filter(f -> f.terms(t -> t.field("serviceName").terms(ts -> ts.value(serviceValues))));
        }

        if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
            boolQueryBuilder.must(m -> m.match(t -> t.field("message").query(request.getKeyword())));
        }

        Query query = Query.of(q -> q.bool(boolQueryBuilder.build()));

        // Bucket width scales with the requested span so a 7-day range doesn't
        // render as 168 hourly slivers and a 15-minute range doesn't render as
        // a single hourly bar. The chosen label is reported back so the
        // frontend's axis text can never contradict the actual bucket size
        // (it used to hardcode "events / hour" regardless of range -- see F13).
        HistogramResolution resolution = resolveHistogramResolution(request);
        Aggregation dateHistogram = Aggregation.of(a -> a.dateHistogram(
                DateHistogramAggregation.of(dh -> dh.field("timestamp").calendarInterval(resolution.interval()))
        ).aggregations("by_level", Aggregation.of(sub -> sub.terms(TermsAggregation.of(t -> t.field("level"))))));

        // Terms Aggregation for Severity Distribution
        Aggregation severityDist = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("level"))));

        // Terms Aggregation for the set of services present in the org -- used to
        // populate the Explorer's service filter regardless of what's on this page of hits.
        Aggregation serviceNamesAgg = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("serviceName").size(100))));

        // Terms Aggregation for pattern clusters (SHA-256 template hash), with a
        // per-cluster severity breakdown and one representative sample document.
        Aggregation patternClustersAgg = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("patternHash").size(50)))
                .aggregations("by_level", Aggregation.of(sub -> sub.terms(TermsAggregation.of(t -> t.field("level")))))
                .aggregations("sample", Aggregation.of(sub -> sub.topHits(TopHitsAggregation.of(th -> th.size(1))))));

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .withSort(s -> s.field(f -> f.field("timestamp").order(SortOrder.Desc)))
                .withAggregation("histogram", dateHistogram)
                .withAggregation("severityDistribution", severityDist)
                .withAggregation("serviceNames", serviceNamesAgg)
                .withAggregation("patternClusters", patternClustersAgg)
                .withPageable(PageRequest.of(request.getPage(), request.getSize()))
                .build();

        SearchHits<LogEntry> searchHits = elasticsearchOperations.search(nativeQuery, LogEntry.class);

        // Map Results
        List<LogEntry> logs = searchHits.getSearchHits().stream()
                .map(hit -> hit.getContent())
                .collect(Collectors.toList());

        LogSearchResponse response = new LogSearchResponse();
        response.setLogs(logs);
        response.setTotal(searchHits.getTotalHits());

        response.setHistogram(parseHistogram(searchHits));
        response.setSeverityDistribution(parseSeverityDistribution(searchHits));
        response.setServiceNames(parseServiceNames(searchHits));
        response.setPatternClusters(parsePatternClusters(searchHits, organizationId));
        response.setHistogramInterval(resolution.label());

        return response;
    }

    private record HistogramResolution(CalendarInterval interval, String label) {}

    /**
     * "All time" and open-ended custom ranges have no fixed span to key off,
     * so they fall through to the coarsest bucket (Week) rather than trying
     * to interpolate a real duration from the data itself.
     */
    private HistogramResolution resolveHistogramResolution(LogSearchRequest request) {
        Long start = request.getStartDate();
        if (start == null) {
            return new HistogramResolution(CalendarInterval.Week, "week");
        }
        long end = request.getEndDate() != null ? request.getEndDate() : System.currentTimeMillis();
        long spanMs = end - start;
        long hour = 3_600_000L;
        long day = 24 * hour;

        if (spanMs <= 3 * hour) {
            return new HistogramResolution(CalendarInterval.Minute, "minute");
        }
        if (spanMs <= 3 * day) {
            return new HistogramResolution(CalendarInterval.Hour, "hour");
        }
        if (spanMs <= 60 * day) {
            return new HistogramResolution(CalendarInterval.Day, "day");
        }
        return new HistogramResolution(CalendarInterval.Week, "week");
    }

    private List<Map<String, Object>> parseHistogram(SearchHits<LogEntry> searchHits) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchHits.getAggregations() != null) {
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations aggregations = 
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations) searchHits.getAggregations();
            
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation elasticsearchAggregation = 
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation) aggregations.aggregationsAsMap().get("histogram");
            
            co.elastic.clients.elasticsearch._types.aggregations.Aggregate aggregate = 
                elasticsearchAggregation != null ? elasticsearchAggregation.aggregation().getAggregate() : null;
                
            if (aggregate != null && aggregate.isDateHistogram()) {
                aggregate.dateHistogram().buckets().array().forEach(bucket -> {
                    Map<String, Object> bucketMap = new HashMap<>();
                    bucketMap.put("timestamp", bucket.key());
                    bucketMap.put("count", bucket.docCount());
                    
                    Map<String, Long> levels = new HashMap<>();
                    if (bucket.aggregations().containsKey("by_level")) {
                        co.elastic.clients.elasticsearch._types.aggregations.Aggregate levelAgg = bucket.aggregations().get("by_level");
                        if (levelAgg.isSterms()) {
                            levelAgg.sterms().buckets().array().forEach(lvlBucket -> {
                                levels.put(lvlBucket.key().stringValue(), lvlBucket.docCount());
                            });
                        }
                    }
                    bucketMap.put("levels", levels);
                    result.add(bucketMap);
                });
            }
        }
        return result;
    }

    private List<Map<String, Object>> parseSeverityDistribution(SearchHits<LogEntry> searchHits) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchHits.getAggregations() != null) {
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations aggregations = 
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations) searchHits.getAggregations();
                
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation elasticsearchAggregation = 
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation) aggregations.aggregationsAsMap().get("severityDistribution");
            
            co.elastic.clients.elasticsearch._types.aggregations.Aggregate aggregate = 
                elasticsearchAggregation != null ? elasticsearchAggregation.aggregation().getAggregate() : null;
                
            if (aggregate != null && aggregate.isSterms()) {
                aggregate.sterms().buckets().array().forEach(bucket -> {
                    Map<String, Object> bucketMap = new HashMap<>();
                    bucketMap.put("level", bucket.key().stringValue());
                    bucketMap.put("count", bucket.docCount());
                    result.add(bucketMap);
                });
            }
        }
        return result;
    }

    private List<Map<String, Object>> parseServiceNames(SearchHits<LogEntry> searchHits) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchHits.getAggregations() != null) {
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations aggregations =
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations) searchHits.getAggregations();

            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation elasticsearchAggregation =
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation) aggregations.aggregationsAsMap().get("serviceNames");

            co.elastic.clients.elasticsearch._types.aggregations.Aggregate aggregate =
                elasticsearchAggregation != null ? elasticsearchAggregation.aggregation().getAggregate() : null;

            if (aggregate != null && aggregate.isSterms()) {
                aggregate.sterms().buckets().array().forEach(bucket -> {
                    Map<String, Object> bucketMap = new HashMap<>();
                    bucketMap.put("name", bucket.key().stringValue());
                    bucketMap.put("count", bucket.docCount());
                    result.add(bucketMap);
                });
            }
        }
        return result;
    }

    /**
     * "sample" is a top_hits(size=1) sub-aggregation, so its source document
     * deserializes straight into a LogEntry via the client's attached mapper --
     * no manual JSON field extraction needed.
     */
    private List<Map<String, Object>> parsePatternClusters(SearchHits<LogEntry> searchHits, String organizationId) {
        // Load all patterns for this org so we can attach firstSeen to the clusters
        Map<String, java.sql.Timestamp> firstSeenMap = new HashMap<>();
        if (organizationId != null) {
            try {
                Long orgIdLong = Long.parseLong(organizationId);
                logPatternRepository.findByOrganizationId(orgIdLong, org.springframework.data.domain.Pageable.unpaged())
                        .forEach(p -> firstSeenMap.put(p.getPatternHash(), p.getFirstSeen()));
            } catch (NumberFormatException ignored) {}
        }
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchHits.getAggregations() != null) {
            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations aggregations =
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations) searchHits.getAggregations();

            org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation elasticsearchAggregation =
                (org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregation) aggregations.aggregationsAsMap().get("patternClusters");

            co.elastic.clients.elasticsearch._types.aggregations.Aggregate aggregate =
                elasticsearchAggregation != null ? elasticsearchAggregation.aggregation().getAggregate() : null;

            if (aggregate != null && aggregate.isSterms()) {
                aggregate.sterms().buckets().array().forEach(bucket -> {
                    Map<String, Object> bucketMap = new HashMap<>();
                    String hash = bucket.key().stringValue();
                    bucketMap.put("patternHash", hash);
                    bucketMap.put("count", bucket.docCount());
                    if (firstSeenMap.containsKey(hash)) {
                        bucketMap.put("firstSeen", firstSeenMap.get(hash).toInstant().toString());
                    }

                    Map<String, Long> levels = new HashMap<>();
                    if (bucket.aggregations().containsKey("by_level")) {
                        co.elastic.clients.elasticsearch._types.aggregations.Aggregate levelAgg = bucket.aggregations().get("by_level");
                        if (levelAgg.isSterms()) {
                            levelAgg.sterms().buckets().array().forEach(lvlBucket -> {
                                levels.put(lvlBucket.key().stringValue(), lvlBucket.docCount());
                            });
                        }
                    }
                    bucketMap.put("levels", levels);

                    if (bucket.aggregations().containsKey("sample")) {
                        co.elastic.clients.elasticsearch._types.aggregations.Aggregate sampleAgg = bucket.aggregations().get("sample");
                        if (sampleAgg.isTopHits()) {
                            List<Hit<JsonData>> hits = sampleAgg.topHits().hits().hits();
                            JsonData sampleSource = hits.isEmpty() ? null : hits.get(0).source();
                            // LogEntry has no Jackson-visible default constructor (only the
                            // Spring Data @PersistenceCreator one), so .to(LogEntry.class) fails.
                            // Read the two fields we need straight off the raw JSON object instead.
                            if (sampleSource != null) {
                                jakarta.json.JsonObject sampleJson = sampleSource.toJson().asJsonObject();
                                bucketMap.put("sampleMessage", sampleJson.getString("message", null));
                                bucketMap.put("sampleService", sampleJson.getString("serviceName", null));
                            }
                        }
                    }

                    result.add(bucketMap);
                });
            }
        }
        return result;
    }
}
