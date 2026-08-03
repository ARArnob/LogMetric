package org.example.logmetricapi.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LogAnalyticsService {

    private static final double ALPHA = 0.1;
    private static final int ENTROPY_WINDOW_SIZE = 32;

    private final Map<String, EmaState> stateByKey = new ConcurrentHashMap<>();

    private static class EmaState {
        double ema = 0.0;
        double emVar = 0.0;
        boolean initialized = false;
    }

    public double calculateMaxWindowEntropy(String message) {
        if (message == null || message.length() < ENTROPY_WINDOW_SIZE) {
            return calculateShannonEntropy(message);
        }

        double maxEntropy = 0.0;
        for (int i = 0; i <= message.length() - ENTROPY_WINDOW_SIZE; i++) {
            String window = message.substring(i, i + ENTROPY_WINDOW_SIZE);
            maxEntropy = Math.max(maxEntropy, calculateShannonEntropy(window));
        }
        return maxEntropy;
    }

    private double calculateShannonEntropy(String payload) {
        if (payload == null || payload.isEmpty()) return 0.0;

        Map<Character, Integer> frequencies = new HashMap<>();
        for (char c : payload.toCharArray()) {
            frequencies.put(c, frequencies.getOrDefault(c, 0) + 1);
        }

        double entropy = 0.0;
        int length = payload.length();

        for (int count : frequencies.values()) {
            double probability = (double) count / length;
            entropy -= probability * (Math.log(probability) / Math.log(2));
        }
        return entropy;
    }

    public boolean isPayloadObfuscated(String payload, double threshold) {
        return calculateMaxWindowEntropy(payload) > threshold;
    }

    public double calculateDynamicZScore(String key, long currentTrafficCount) {
        EmaState s = stateByKey.computeIfAbsent(key, k -> new EmaState());
        
        synchronized (s) {
            if (!s.initialized) {
                s.ema = currentTrafficCount;
                s.initialized = true;
                return 0.0;
            }
            
            double diff = currentTrafficCount - s.ema;
            s.ema += ALPHA * diff;
            
            // Welford's variant for incremental variance
            s.emVar = (1 - ALPHA) * (s.emVar + ALPHA * diff * diff);
            
            double stdDev = Math.max(Math.sqrt(s.emVar), 1.0);
            return diff / stdDev;
        }
    }

    public boolean isTrafficAnomalous(double zScore, double threshold) {
        return zScore > threshold;
    }
}