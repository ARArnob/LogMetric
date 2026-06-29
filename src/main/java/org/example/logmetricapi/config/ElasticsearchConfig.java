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

package org.example.logmetricapi.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
import org.springframework.data.elasticsearch.support.HttpHeaders;

@Configuration
@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
public class ElasticsearchConfig extends ElasticsearchConfiguration {
    @Value("${ELASTIC_API_KEY}")
    private String elasticApiKey;

    @Value("${ELASTIC_URL}")
    private String elasticUrl;
    @Override
    public ClientConfiguration clientConfiguration(){
        HttpHeaders headers = new HttpHeaders();
        // PASTE YOUR REAL COPY-PASTED TOKEN STRING HERE:
        headers.add("Authorization", "ApiKey " + elasticApiKey);

        return ClientConfiguration.builder()
                // PASTE YOUR REAL COPIED ENDPOINT URL HERE (Without https://, ending in :443):
                .connectedTo(elasticUrl)
                .usingSsl()
                .withDefaultHeaders(headers)
                .build();
    }
}
