package org.example.logmetricapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.Organization;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class CompressionAnalyticsTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LogPatternRepository logPatternRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void emptyOrgReturnsZeros() throws Exception {
        String[] setup = registerVerifiedAdmin();
        String token = setup[0];

        MvcResult result = mockMvc.perform(get("/api/analytics/compression")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        var json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("totalEvents").asLong()).isEqualTo(0);
        assertThat(json.get("distinctTemplates").asLong()).isEqualTo(0);
        assertThat(json.get("projectedSavingPercent").asDouble()).isEqualTo(0.0);
    }

    @Test
    void aggregatesMatchComputedValuesAndAreIsolated() throws Exception {
        String[] setupA = registerVerifiedAdmin();
        String tokenA = setupA[0];
        Organization orgA = userRepository.findByEmail(setupA[1]).orElseThrow().getOrganization();

        String[] setupB = registerVerifiedAdmin();
        Organization orgB = userRepository.findByEmail(setupB[1]).orElseThrow().getOrganization();

        Timestamp now = Timestamp.from(Instant.now());
        
        // Org A: 2 distinct templates, total 300 occurrences.
        // t1: 100 occurrences. length 20. 
        logPatternRepository.recordOccurrence(orgA.getId(), "hash1", "short template 1", "sample", now);
        for (int i = 0; i < 99; i++) {
            logPatternRepository.recordOccurrence(orgA.getId(), "hash1", "short template 1", "sample", now);
        }

        // t2: 200 occurrences. length 20.
        logPatternRepository.recordOccurrence(orgA.getId(), "hash2", "short template 2", "sample", now);
        for (int i = 0; i < 199; i++) {
            logPatternRepository.recordOccurrence(orgA.getId(), "hash2", "short template 2", "sample", now);
        }

        // Org B: some random data, should not affect Org A
        logPatternRepository.recordOccurrence(orgB.getId(), "hash3", "org B template", "sample", now);

        MvcResult result = mockMvc.perform(get("/api/analytics/compression")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        var json = objectMapper.readTree(result.getResponse().getContentAsString());
        
        // Total Events = 300
        assertThat(json.get("totalEvents").asLong()).isEqualTo(300);
        
        // Distinct Templates = 2
        assertThat(json.get("distinctTemplates").asLong()).isEqualTo(2);
        
        // Events Per Template = 150.0
        assertThat(json.get("eventsPerTemplate").asDouble()).isEqualTo(150.0);
        
        // Template Bytes: 16 (short template 1) + 16 (short template 2) = 32
        assertThat(json.get("templateBytes").asLong()).isEqualTo(32);
        
        // Top Templates ordering
        var topTemplates = json.get("topTemplatesByVolume");
        assertThat(topTemplates.size()).isEqualTo(2);
        assertThat(topTemplates.get(0).get("template").asText()).isEqualTo("short template 2");
        assertThat(topTemplates.get(0).get("occurrenceCount").asLong()).isEqualTo(200);
        assertThat(topTemplates.get(1).get("template").asText()).isEqualTo("short template 1");
        assertThat(topTemplates.get(1).get("occurrenceCount").asLong()).isEqualTo(100);
    }

    // returns [token, email]
    private String[] registerVerifiedAdmin() throws Exception {
        String email = "p5-admin-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register")
                        .header("X-Forwarded-For", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", "P5-Org-" + UUID.randomUUID()))))
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
}
