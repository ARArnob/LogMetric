package org.example.logmetricapi.repository;

import org.example.logmetricapi.model.LogEntry;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogRepository extends ElasticsearchRepository<LogEntry, String>{

}
