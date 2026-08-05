package org.example.logmetricapi.dto;

import java.util.List;

public record CompressionStatsResponse(
        long totalEvents,
        long distinctTemplates,
        double eventsPerTemplate,
        long avgMessageBytes,
        long rawBytes,
        long templateBytes,
        long projectedBytesWithSampling,
        double projectedSavingPercent,
        List<TopTemplateVolume> topTemplatesByVolume
) {
    public record TopTemplateVolume(String template, long occurrenceCount, double sharePercent) {}
}
