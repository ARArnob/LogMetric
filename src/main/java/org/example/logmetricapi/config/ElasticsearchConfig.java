//package org.example.logmetricapi.config;
//
//import org.springframework.context.annotation.Configuration;
//import org.springframework.data.elasticsearch.client.ClientConfiguration;
//import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
//import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
//
//@Configuration
//@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
//public class ElasticsearchConfig extends ElasticsearchConfiguration {
//    @Override
//    public ClientConfiguration clientConfiguration(){
//        return ClientConfiguration.builder().connectedTo("localhost:9200").build();
//    }
//}

//package org.example.logmetricapi.config;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.data.elasticsearch.client.ClientConfiguration;
//import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
//import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
//import org.springframework.data.elasticsearch.support.HttpHeaders;
//
//@Configuration
//@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
//public class ElasticsearchConfig extends ElasticsearchConfiguration {
//    @Value("${ELASTIC_API_KEY:}")
//    private String elasticApiKey;
//
//    @Value("${ELASTIC_URL}")
//    private String elasticUrl;
//    @Override
//    public ClientConfiguration clientConfiguration(){
//        HttpHeaders headers = new HttpHeaders();
//        // PASTE YOUR REAL COPY-PASTED TOKEN STRING HERE:
//        headers.add("Authorization", "ApiKey " + elasticApiKey);
//
//        return ClientConfiguration.builder()
//                // PASTE YOUR REAL COPIED ENDPOINT URL HERE (Without https://, ending in :443):
//                .connectedTo(elasticUrl)
//                .usingSsl()
//                .withDefaultHeaders(headers)
//                .build();
//    }
//}

package org.example.logmetricapi.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.example.logmetricapi.model.LogEntry;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
import org.springframework.data.elasticsearch.support.HttpHeaders;

@Configuration
@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Value("${ELASTIC_API_KEY:}")
    private String elasticApiKey;

    // Default to local Docker container if no URL is provided
    @Value("${ELASTIC_URL:localhost:9200}")
    private String elasticUrl;

    @Override
    public ClientConfiguration clientConfiguration() {

        // CLOUD MODE: If an API key exists, apply SSL and Authorization headers
        if (elasticApiKey != null && !elasticApiKey.trim().isEmpty()) {
            HttpHeaders headers = new HttpHeaders();
            headers.add("Authorization", "ApiKey " + elasticApiKey);

            return ClientConfiguration.builder()
                    .connectedTo(elasticUrl)
                    .usingSsl()
                    .withDefaultHeaders(headers)
                    .build();
        }

        // LOCAL MODE: If no API key, connect in plaintext for local Docker
        return ClientConfiguration.builder()
                .connectedTo(elasticUrl)
                .build();
    }

    @Bean
    public CommandLineRunner initIndices(ElasticsearchOperations elasticsearchOperations) {
        return args -> {
            IndexOperations indexOps = elasticsearchOperations.indexOps(LogEntry.class);
            if (!indexOps.exists()) {
                indexOps.create();
                indexOps.putMapping(indexOps.createMapping(LogEntry.class));
            }
        };
    }
}