package org.example.logmetricapi.service;

import org.example.logmetricapi.model.LogEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private static final Logger log = LoggerFactory.getLogger(SseService.class);

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emittersByOrganization =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(String organizationId) {
        SseEmitter emitter = new SseEmitter(300_000L);
        CopyOnWriteArrayList<SseEmitter> emitters =
                emittersByOrganization.computeIfAbsent(organizationId, id -> new CopyOnWriteArrayList<>());
        emitters.add(emitter);

        emitter.onCompletion(() -> removeEmitter(organizationId, emitter));
        emitter.onTimeout(() -> removeEmitter(organizationId, emitter));
        emitter.onError((e) -> removeEmitter(organizationId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to LogMetric Stream"));
        } catch (IOException e) {
            removeEmitter(organizationId, emitter);
        }

        return emitter;
    }

    public void broadcast(LogEntry logEntry) {
        String organizationId = logEntry.getOrganizationId();
        if (organizationId == null) {
            log.warn("Dropping SSE broadcast for log {} — missing organizationId", logEntry.getId());
            return;
        }

        CopyOnWriteArrayList<SseEmitter> emitters = emittersByOrganization.get(organizationId);
        if (emitters == null) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("log").data(logEntry));
            } catch (IOException e) {
                removeEmitter(organizationId, emitter);
            }
        }
    }

    private void removeEmitter(String organizationId, SseEmitter emitter) {
        emittersByOrganization.computeIfPresent(organizationId, (id, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
    }
}
