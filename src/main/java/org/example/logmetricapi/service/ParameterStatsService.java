package org.example.logmetricapi.service;

import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.PatternParamWindow;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.PatternParamWindowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ParameterStatsService {

    private static final Logger logger = LoggerFactory.getLogger(ParameterStatsService.class);

    private static final int MAX_KEYS_PER_ORG = 200;
    private static final int MAX_DISTINCT_VALUES_PER_KEY = 5000;

    public record ParamKey(Long orgId, String patternHash, int paramIndex) {}

    public static class ParamStats {
        private final Set<String> distinctValues = ConcurrentHashMap.newKeySet();
        private final AtomicLong totalCount = new AtomicLong(0);

        public void recordValue(String value) {
            totalCount.incrementAndGet();
            if (distinctValues.size() < MAX_DISTINCT_VALUES_PER_KEY || distinctValues.contains(value)) {
                distinctValues.add(value);
            }
        }

        public int getDistinctCount() {
            return distinctValues.size();
        }

        public long getTotalCount() {
            return totalCount.get();
        }
    }

    public record StatsHolder(
            ConcurrentHashMap<ParamKey, ParamStats> map,
            ConcurrentHashMap<Long, AtomicInteger> orgKeyCounts,
            long windowStartTimeMillis
    ) {}

    private final AtomicReference<StatsHolder> currentStats;
    private final PatternParamWindowRepository windowRepository;
    private final OrganizationRepository organizationRepository;

    public ParameterStatsService(PatternParamWindowRepository windowRepository, OrganizationRepository organizationRepository) {
        this.windowRepository = windowRepository;
        this.organizationRepository = organizationRepository;
        this.currentStats = new AtomicReference<>(new StatsHolder(
                new ConcurrentHashMap<>(),
                new ConcurrentHashMap<>(),
                System.currentTimeMillis()
        ));
    }

    public void recordParamValue(Long orgId, String patternHash, int paramIndex, String value) {
        StatsHolder holder = currentStats.get();
        ParamKey key = new ParamKey(orgId, patternHash, paramIndex);

        ParamStats stats = holder.map().get(key);
        if (stats == null) {
            AtomicInteger orgCount = holder.orgKeyCounts().computeIfAbsent(orgId, k -> new AtomicInteger(0));
            if (orgCount.get() >= MAX_KEYS_PER_ORG) {
                // To avoid log spam, we might want to sample this, but keeping it simple as per plan.
                logger.warn("Organization {} exceeded max parameter keys ({}) for this window. Dropping new key {}.", orgId, MAX_KEYS_PER_ORG, key);
                return;
            }
            
            // Recheck count under putIfAbsent to prevent race condition overshooting the cap
            stats = holder.map().computeIfAbsent(key, k -> {
                if (orgCount.incrementAndGet() > MAX_KEYS_PER_ORG) {
                    orgCount.decrementAndGet();
                    return null;
                }
                return new ParamStats();
            });
            
            if (stats == null) {
                logger.warn("Organization {} exceeded max parameter keys ({}) for this window. Dropping new key {}.", orgId, MAX_KEYS_PER_ORG, key);
                return;
            }
        }

        stats.recordValue(value);
    }

    @Scheduled(fixedRate = 300_000)
    public void scheduledFlush() {
        flushNow();
    }

    public void flushNow() {
        long flushTime = System.currentTimeMillis();
        StatsHolder oldHolder = currentStats.getAndSet(new StatsHolder(
                new ConcurrentHashMap<>(),
                new ConcurrentHashMap<>(),
                flushTime
        ));

        if (oldHolder.map().isEmpty()) {
            return;
        }

        Timestamp windowStart = new Timestamp(oldHolder.windowStartTimeMillis());
        Timestamp windowEnd = new Timestamp(flushTime);

        List<PatternParamWindow> entities = new ArrayList<>();
        
        for (Map.Entry<ParamKey, ParamStats> entry : oldHolder.map().entrySet()) {
            ParamKey key = entry.getKey();
            ParamStats stats = entry.getValue();

            // Fetch organization proxy to save without hitting DB
            Organization org = organizationRepository.getReferenceById(key.orgId());
            
            PatternParamWindow window = new PatternParamWindow(
                    org,
                    key.patternHash(),
                    key.paramIndex(),
                    windowStart,
                    windowEnd,
                    stats.getDistinctCount(),
                    stats.getTotalCount()
            );
            entities.add(window);
        }

        if (!entities.isEmpty()) {
            windowRepository.saveAll(entities);
            logger.debug("Flushed {} parameter windows to database.", entities.size());
        }
    }
}
