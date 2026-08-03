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

@Configuration
@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Value("${spring.elasticsearch.uris:localhost:9200}")
    private String elasticUri;

    @Value("${spring.elasticsearch.username:}")
    private String username;

    @Value("${spring.elasticsearch.password:}")
    private String password;

    @Override
    public ClientConfiguration clientConfiguration() {
        // Spring's connectedTo() strictly requires host:port without the protocol prefix
        String hostAndPort = elasticUri.replace("https://", "").replace("http://", "");

        // CLOUD MODE: If a username exists, use SSL and Basic Authentication (Bonsai)
        if (username != null && !username.trim().isEmpty()) {
            return ClientConfiguration.builder()
                    .connectedTo(hostAndPort)
                    .usingSsl()
                    .withBasicAuth(username, password)
                    .build();
        }

        // LOCAL MODE: Plaintext connection for local Docker
        return ClientConfiguration.builder()
                .connectedTo(hostAndPort)
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
