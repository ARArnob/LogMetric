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

import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
import org.springframework.data.elasticsearch.support.HttpHeaders;

@Configuration
@EnableElasticsearchRepositories(basePackages = "org.example.logmetricapi")
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Override
    public ClientConfiguration clientConfiguration(){
        HttpHeaders headers = new HttpHeaders();
        // PASTE YOUR REAL COPY-PASTED TOKEN STRING HERE:
        headers.add("Authorization", "ApiKey M2FIX0U1OEJOcXpCb2h1bHN2Tjk6WFdUOHgyZWhLVDhCTEw3Smd2ZDlBQQ==");

        return ClientConfiguration.builder()
                // PASTE YOUR REAL COPIED ENDPOINT URL HERE (Without https://, ending in :443):
                .connectedTo("my-elasticsearch-project-bf1901.es.us-central1.gcp.elastic.cloud:443")
                .usingSsl()
                .withDefaultHeaders(headers)
                .build();
    }
}
