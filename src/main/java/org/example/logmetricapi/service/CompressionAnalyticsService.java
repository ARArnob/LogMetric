package org.example.logmetricapi.service;

import org.example.logmetricapi.dto.CompressionStatsResponse;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CompressionAnalyticsService {

    private final LogPatternRepository logPatternRepository;

    public CompressionAnalyticsService(LogPatternRepository logPatternRepository) {
        this.logPatternRepository = logPatternRepository;
    }

    public CompressionStatsResponse getCompressionStats(Long orgId) {
        LogPatternRepository.PatternAggregateStats stats = logPatternRepository.getAggregateStats(orgId);
        
        long totalEvents = stats.getTotalEvents();
        long distinctTemplates = stats.getDistinctTemplates();
        long templateBytes = stats.getTemplateBytes();
        
        if (totalEvents == 0 || distinctTemplates == 0) {
            return new CompressionStatsResponse(
                    0, 0, 0.0, 0, 0, 0, 0, 0.0, List.of()
            );
        }

        double eventsPerTemplate = (double) totalEvents / distinctTemplates;
        // We don't have the exact total raw size stored efficiently, 
        // so we use an assumed average raw message size to project the savings.
        long avgMessageBytes = 120;
        long rawBytes = totalEvents * avgMessageBytes;
        
        // Assume retaining 5% of raw log bodies plus exact metadata and template strings.
        long projectedBytesWithSampling = (long) (rawBytes * 0.05) + templateBytes;
        double projectedSavingPercent = 100.0 * (1.0 - (double) projectedBytesWithSampling / rawBytes);
        if (projectedSavingPercent < 0) projectedSavingPercent = 0.0;

        List<LogPattern> topPatterns = logPatternRepository.findTop5ByOrganizationIdOrderByOccurrenceCountDesc(orgId);
        List<CompressionStatsResponse.TopTemplateVolume> topTemplatesByVolume = topPatterns.stream()
                .map(p -> new CompressionStatsResponse.TopTemplateVolume(
                        p.getTemplate(), 
                        p.getOccurrenceCount(), 
                        (double) p.getOccurrenceCount() / totalEvents * 100.0))
                .collect(Collectors.toList());

        return new CompressionStatsResponse(
                totalEvents,
                distinctTemplates,
                eventsPerTemplate,
                avgMessageBytes,
                rawBytes,
                templateBytes,
                projectedBytesWithSampling,
                projectedSavingPercent,
                topTemplatesByVolume
        );
    }
}
