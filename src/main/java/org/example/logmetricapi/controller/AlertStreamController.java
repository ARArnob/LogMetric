package org.example.logmetricapi.controller;

import org.example.logmetricapi.service.SseService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class AlertStreamController {

    private final SseService sseService;

    public AlertStreamController(SseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/api/alerts/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String organizationId = AuthUtils.requireOrganizationIdAsString(authentication);
        return sseService.subscribeToAlerts(organizationId);
    }
}
