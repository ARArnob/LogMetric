package org.example.logmetricapi;

import org.example.logmetricapi.service.LogAnalyticsService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * T25 (PLAN.md): EMA z-score and Shannon entropy against known inputs.
 * LogAnalyticsService has no dependencies, so this runs without a Spring
 * context or docker compose.
 */
class LogAnalyticsServiceTests {

    private final LogAnalyticsService service = new LogAnalyticsService();

    @Test
    void repetitiveTextHasExactlyZeroEntropy() {
        // A single repeated character has probability 1 -- entropy is exactly
        // zero, not just "low", regardless of window size.
        assertThat(service.calculateMaxWindowEntropy("a".repeat(40))).isZero();
    }

    @Test
    void thirtyTwoDistinctCharactersProduceExactlyLog2Of32Entropy() {
        // 26 letters + 6 digits = 32 distinct characters, exactly one
        // ENTROPY_WINDOW_SIZE-wide window -- a uniform distribution over 32
        // symbols has an exact Shannon entropy of log2(32) = 5.0 bits. A
        // derivable value, not an estimate of what "looks obfuscated".
        String allDistinct = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
        assertThat(allDistinct).hasSize(32);
        assertThat(service.calculateMaxWindowEntropy(allDistinct)).isCloseTo(5.0, within(0.0001));
    }

    @Test
    void isPayloadObfuscatedRespectsTheGivenThresholdNotAHardcodedConstant() {
        String message = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"; // entropy exactly 5.0, see above
        assertThat(service.isPayloadObfuscated(message, 4.9)).isTrue();
        assertThat(service.isPayloadObfuscated(message, 5.1)).isFalse();
    }

    @Test
    void firstObservationEstablishesBaselineWithZeroZScore() {
        double zScore = service.calculateDynamicZScore("svc-" + System.nanoTime(), 100);
        assertThat(zScore).isZero();
    }

    @Test
    void aSuddenSpikeAfterAPerfectlyStableBaselineProducesTheExpectedZScoreAndIsFlaggedAnomalous() {
        String key = "svc-" + System.nanoTime();
        // Perfectly stable traffic (identical count every time) keeps the EMA
        // variance at exactly zero -- so the very next non-zero deviation
        // always yields z = diff / (0.3 * diff) = 1 / sqrt(0.9 * ALPHA) ≈
        // 3.333, a derivable constant given ALPHA=0.1, not an estimate.
        for (int i = 0; i < 10; i++) {
            service.calculateDynamicZScore(key, 100);
        }
        double zScore = service.calculateDynamicZScore(key, 5000);

        assertThat(zScore).isCloseTo(3.333, within(0.01));
        assertThat(service.isTrafficAnomalous(zScore, 3.0)).isTrue();
    }

    @Test
    void stableTrafficIsNeverFlaggedAnomalous() {
        String key = "svc-" + System.nanoTime();
        double lastZScore = 0;
        for (int i = 0; i < 20; i++) {
            lastZScore = service.calculateDynamicZScore(key, 100);
        }
        assertThat(service.isTrafficAnomalous(lastZScore, 3.0)).isFalse();
    }
}
