package org.example.logmetricapi.controller;

import org.example.logmetricapi.model.LogEntry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class LogController {
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    public LogController(org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/api/logs")
    public String ingestLog(@RequestBody LogEntry log){
        System.out.println(log);
        rabbitTemplate.convertAndSend("log.queue", log);
        return "200 OK - Log Ingested Successfully";
    }
    @GetMapping("/api/logs")
    public ResponseEntity<?> findByLevel(@RequestParam(required = false) String level){
        if(level == null || level.trim().isEmpty()){
            return ResponseEntity.badRequest().body("Invalid level");
        }
        return ResponseEntity.ok("Search temporarily offline for Elasticsearch migration.");
    }
}