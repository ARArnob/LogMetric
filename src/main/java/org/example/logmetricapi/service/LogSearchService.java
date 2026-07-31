package org.example.logmetricapi.service;

import org.example.logmetricapi.dto.LogSearchRequest;
import org.example.logmetricapi.dto.LogSearchResponse;
import org.example.logmetricapi.model.LogEntry;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class LogSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public LogSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    public LogSearchResponse searchLogs(LogSearchRequest request, String organizationId) {
        NativeQuery nativeQuery = NativeQuery.builder()
                .withPageable(PageRequest.of(request.getPage(), request.getSize()))
                .build();

        SearchHits<LogEntry> searchHits = elasticsearchOperations.search(nativeQuery, LogEntry.class);

        LogSearchResponse response = new LogSearchResponse();
        response.setLogs(searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .collect(Collectors.toList()));
        response.setTotal(searchHits.getTotalHits());

        return response;
    }
}