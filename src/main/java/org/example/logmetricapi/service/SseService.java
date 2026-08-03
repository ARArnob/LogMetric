package org.example.logmetricapi.service;

import org.example.logmetricapi.dto.AlertEvent;
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

    private final EmitterChannel logEmitters = new EmitterChannel();
    private final EmitterChannel alertEmitters = new EmitterChannel();

    public SseEmitter subscribe(String organizationId) {
        return logEmitters.subscribe(organizationId, "Connected to LogMetric Stream");
    }

    public void broadcast(LogEntry logEntry) {
        String organizationId = logEntry.getOrganizationId();
        if (organizationId == null) {
            log.warn("Dropping SSE broadcast for log {} — missing organizationId", logEntry.getId());
            return;
        }
        logEmitters.broadcast(organizationId, "log", logEntry);
    }

    public SseEmitter subscribeToAlerts(String organizationId) {
        return alertEmitters.subscribe(organizationId, "Connected to LogMetric Alerts Stream");
    }

    public void broadcastAlert(String organizationId, AlertEvent event) {
        if (organizationId == null) {
            log.warn("Dropping alert broadcast for rule {} — missing organizationId", event.getRuleId());
            return;
        }
        alertEmitters.broadcast(organizationId, "alert", event);
    }

    /**
     * One org-keyed emitter registry per stream (T1's original pattern for
     * the log stream), factored out once a second channel (alerts, T22)
     * needed the exact same subscribe/broadcast/cleanup discipline.
     */
    private static final class EmitterChannel {
        private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emittersByOrganization =
                new ConcurrentHashMap<>();

        SseEmitter subscribe(String organizationId, String initMessage) {
            SseEmitter emitter = new SseEmitter(300_000L);
            CopyOnWriteArrayList<SseEmitter> emitters =
                    emittersByOrganization.computeIfAbsent(organizationId, id -> new CopyOnWriteArrayList<>());
            emitters.add(emitter);

            emitter.onCompletion(() -> remove(organizationId, emitter));
            emitter.onTimeout(() -> remove(organizationId, emitter));
            emitter.onError((e) -> remove(organizationId, emitter));

            try {
                emitter.send(SseEmitter.event().name("INIT").data(initMessage));
            } catch (IOException e) {
                remove(organizationId, emitter);
            }

            return emitter;
        }

        void broadcast(String organizationId, String eventName, Object data) {
            CopyOnWriteArrayList<SseEmitter> emitters = emittersByOrganization.get(organizationId);
            if (emitters == null) {
                return;
            }
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (IOException e) {
                    remove(organizationId, emitter);
                }
            }
        }

        private void remove(String organizationId, SseEmitter emitter) {
            emittersByOrganization.computeIfPresent(organizationId, (id, emitters) -> {
                emitters.remove(emitter);
                return emitters.isEmpty() ? null : emitters;
            });
        }
    }
}
