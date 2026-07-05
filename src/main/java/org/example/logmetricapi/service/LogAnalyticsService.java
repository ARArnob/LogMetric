package org.example.logmetricapi.service;

import org.springframework.stereotype.Service;

@Service
public class LogAnalyticsService {
    public double calculateZScore(long currentCount, long[] historicalCounts) {
        if (historicalCounts == null || historicalCounts.length == 0) return 0.0;

        double sum = 0;
        for (long count : historicalCounts) sum += count;
        double mean = sum / historicalCounts.length;

        double varianceSum = 0;
        for (long count : historicalCounts) {
            varianceSum += Math.pow((count - mean), 2);
        }
        double variance = varianceSum / historicalCounts.length;
        double stdDev = Math.sqrt(variance);

        if (stdDev == 0.0) stdDev = 0.1; // Prevent divide-by-zero

        return (currentCount - mean) / stdDev;
    }
}