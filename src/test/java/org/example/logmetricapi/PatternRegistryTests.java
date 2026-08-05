package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class PatternRegistryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LogPatternRepository logPatternRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void firstOccurrenceInsertsRow() throws Exception {
        String[] setup = registerVerifiedAdmin();
        Long orgId = getOrgId(setup[1]);
        String hash = "hash-" + UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());

        logPatternRepository.recordOccurrence(orgId, hash, "template1", "sample1", now);

        LogPattern p = logPatternRepository.findByOrganizationId(orgId, org.springframework.data.domain.Pageable.unpaged()).getContent().get(0);
        assertThat(p.getOccurrenceCount()).isEqualTo(1);
        assertThat(p.getFirstSeen().getTime()).isEqualTo(now.getTime());
        assertThat(p.getLastSeen().getTime()).isEqualTo(now.getTime());
    }

    @Test
    void secondOccurrenceIncrementsCountAndAdvancesLastSeen() throws Exception {
        String[] setup = registerVerifiedAdmin();
        Long orgId = getOrgId(setup[1]);
        String hash = "hash-" + UUID.randomUUID();
        Timestamp firstTime = Timestamp.from(Instant.now().minusSeconds(10));
        Timestamp secondTime = Timestamp.from(Instant.now());

        logPatternRepository.recordOccurrence(orgId, hash, "template1", "sample1", firstTime);
        logPatternRepository.recordOccurrence(orgId, hash, "template1", "sample2", secondTime);

        LogPattern p = logPatternRepository.findByOrganizationId(orgId, org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(x -> x.getPatternHash().equals(hash)).findFirst().orElseThrow();
        
        assertThat(p.getOccurrenceCount()).isEqualTo(2);
        assertThat(p.getFirstSeen().getTime()).isEqualTo(firstTime.getTime());
        assertThat(p.getLastSeen().getTime()).isEqualTo(secondTime.getTime());
    }

    @Test
    void sameTemplateDifferentOrgsProducesIndependentRows() throws Exception {
        String[] setupA = registerVerifiedAdmin();
        String[] setupB = registerVerifiedAdmin();
        Long orgIdA = getOrgId(setupA[1]);
        Long orgIdB = getOrgId(setupB[1]);
        
        String hash = "shared-hash-" + UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());

        logPatternRepository.recordOccurrence(orgIdA, hash, "template", "sampleA", now);
        logPatternRepository.recordOccurrence(orgIdB, hash, "template", "sampleB", now);
        logPatternRepository.recordOccurrence(orgIdB, hash, "template", "sampleB2", now);

        LogPattern pA = logPatternRepository.findByOrganizationId(orgIdA, org.springframework.data.domain.Pageable.unpaged()).getContent().get(0);
        LogPattern pB = logPatternRepository.findByOrganizationId(orgIdB, org.springframework.data.domain.Pageable.unpaged()).getContent().get(0);

        assertThat(pA.getOccurrenceCount()).isEqualTo(1);
        assertThat(pB.getOccurrenceCount()).isEqualTo(2);
    }

    @Test
    void getApiReturnsOnlyCallersOrgPatterns() throws Exception {
        String[] setupA = registerVerifiedAdmin();
        String[] setupB = registerVerifiedAdmin();
        Long orgIdA = getOrgId(setupA[1]);
        Long orgIdB = getOrgId(setupB[1]);
        
        String hashA = "hashA";
        String hashB = "hashB";
        Timestamp now = Timestamp.from(Instant.now());

        logPatternRepository.recordOccurrence(orgIdA, hashA, "templateA", "sampleA", now);
        logPatternRepository.recordOccurrence(orgIdB, hashB, "templateB", "sampleB", now);

        MvcResult result = mockMvc.perform(get("/api/patterns").header("Authorization", "Bearer " + setupA[0]))
                .andExpect(status().isOk())
                .andReturn();
        
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("content").size()).isEqualTo(1);
        assertThat(json.get("content").get(0).get("patternHash").asText()).isEqualTo(hashA);
    }

    @Test
    void unauthenticatedIs401() throws Exception {
        mockMvc.perform(get("/api/patterns")).andExpect(status().isUnauthorized());
    }

    @Test
    void concurrentUpsertsAreAtomic() throws Exception {
        String[] setup = registerVerifiedAdmin();
        Long orgId = getOrgId(setup[1]);
        String hash = "concurrent-hash-" + UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());

        int threads = 50;
        ExecutorService executorService = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger failures = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executorService.submit(() -> {
                try {
                    logPatternRepository.recordOccurrence(orgId, hash, "template", "sample", now);
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await();
        executorService.shutdown();

        assertThat(failures.get()).isEqualTo(0);

        LogPattern p = logPatternRepository.findByOrganizationId(orgId, org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(x -> x.getPatternHash().equals(hash)).findFirst().orElseThrow();
        assertThat(p.getOccurrenceCount()).isEqualTo(50);
    }

    // returns [token, email]
    private String[] registerVerifiedAdmin() throws Exception {
        String email = "p1-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "P1-Org-" + UUID.randomUUID()))))
                .andExpect(status().isOk());

        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        return new String[]{token, email};
    }

    private Long getOrgId(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return user.getOrganization().getId();
    }
}
