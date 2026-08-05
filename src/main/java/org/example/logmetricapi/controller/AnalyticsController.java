package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.CompressionStatsResponse;
import org.example.logmetricapi.util.AuthUtils;
import org.example.logmetricapi.service.CompressionAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final CompressionAnalyticsService compressionAnalyticsService;

    public AnalyticsController(CompressionAnalyticsService compressionAnalyticsService) {
        this.compressionAnalyticsService = compressionAnalyticsService;
    }

    @GetMapping("/compression")
    public ResponseEntity<CompressionStatsResponse> getCompressionStats(Authentication authentication) {
        Long orgId = AuthUtils.requireOrganizationId(authentication);
        CompressionStatsResponse stats = compressionAnalyticsService.getCompressionStats(orgId);
        return ResponseEntity.ok(stats);
    }
}
