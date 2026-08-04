package org.example.logmetricapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableAsync
public class LogMetricApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(LogMetricApiApplication.class, args);
    }

}