package org.example.logmetricapi.service;

import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.aggregations.CalendarInterval;
import co.elastic.clients.elasticsearch._types.aggregations.DateHistogramAggregation;
import co.elastic.clients.elasticsearch._types.aggregations.TermsAggregation;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
import org.example.logmetricapi.dto.LogSearchRequest;
import org.example.logmetricapi.dto.LogSearchResponse;
import org.example.logmetricapi.model.LogEntry;
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

    public LogSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    public LogSearchResponse searchLogs(LogSearchRequest request, String organizationId) {
        BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();

        boolQueryBuilder.filter(f -> f.term(t -> t.field("organizationId").value(organizationId)));

        if (request.getSystemId() != null && !request.getSystemId().trim().isEmpty()) {
            boolQueryBuilder.filter(f -> f.term(t -> t.field("systemId").value(request.getSystemId())));
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

        // Date Histogram Aggregation (Hourly)
        Aggregation dateHistogram = Aggregation.of(a -> a.dateHistogram(
                DateHistogramAggregation.of(dh -> dh.field("timestamp").calendarInterval(CalendarInterval.Hour))
        ).aggregations("by_level", Aggregation.of(sub -> sub.terms(TermsAggregation.of(t -> t.field("level"))))));

        // Terms Aggregation for Severity Distribution
        Aggregation severityDist = Aggregation.of(a -> a.terms(TermsAggregation.of(t -> t.field("level"))));

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(query)
                .withAggregation("histogram", dateHistogram)
                .withAggregation("severityDistribution", severityDist)
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

        return response;
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
}
