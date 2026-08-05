package org.example.logmetricapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.support.FakeMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(FakeMailConfig.class)
class DeploymentTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private LogPatternRepository logPatternRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void adminCanCreateAndListDeployments() throws Exception {
        String adminToken = registerVerifiedAdmin();

        Map<String, Object> body = new HashMap<>();
        body.put("version", "v1.0.0");
        body.put("notes", "Initial release");

        MvcResult createResult = createDeployment(adminToken, body).andExpect(status().isOk()).andReturn();
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long id = created.get("id").asLong();
        assertThat(created.get("version").asText()).isEqualTo("v1.0.0");
        assertThat(created.get("notes").asText()).isEqualTo("Initial release");

        MvcResult listResult = mockMvc.perform(get("/api/deployments").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode list = objectMapper.readTree(listResult.getResponse().getContentAsString());
        boolean found = false;
        for (JsonNode node : list) {
            if (node.get("id").asLong() == id) found = true;
        }
        assertThat(found).as("created deployment should appear in the org's list").isTrue();
    }

    @Test
    void blankVersionIsRejected() throws Exception {
        String adminToken = registerVerifiedAdmin();
        Map<String, Object> body = new HashMap<>();
        body.put("version", "");
        createDeployment(adminToken, body).andExpect(status().isBadRequest());
    }

    @Test
    void nonAdminIsForbidden() throws Exception {
        String adminToken = registerVerifiedAdmin();
        String inviteCode = objectMapper.readTree(
                mockMvc.perform(post("/api/invites").header("Authorization", "Bearer " + adminToken))
                        .andReturn().getResponse().getContentAsString()
        ).get("code").asText();
        String memberToken = registerVerifiedInvitee(inviteCode);

        Map<String, Object> body = new HashMap<>();
        body.put("version", "v1.0.1");

        createDeployment(memberToken, body).andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedIsRejected() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("version", "v1.0.2");
        mockMvc.perform(post("/api/deployments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void crossOrgDeploymentLookupIsIsolated() throws Exception {
        String orgAToken = registerVerifiedAdmin("orgA_" + UUID.randomUUID() + "@test.local", "OrgA-" + UUID.randomUUID());
        String orgBToken = registerVerifiedAdmin("orgB_" + UUID.randomUUID() + "@test.local", "OrgB-" + UUID.randomUUID());

        Map<String, Object> body = new HashMap<>();
        body.put("version", "vA.1");
        MvcResult createResult = createDeployment(orgAToken, body).andExpect(status().isOk()).andReturn();
        long orgADeployId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        MvcResult listResult = mockMvc.perform(get("/api/deployments").header("Authorization", "Bearer " + orgBToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode list = objectMapper.readTree(listResult.getResponse().getContentAsString());
        for (JsonNode node : list) {
            assertThat(node.get("id").asLong()).isNotEqualTo(orgADeployId);
        }

        mockMvc.perform(get("/api/deployments/" + orgADeployId + "/new-patterns")
                .header("Authorization", "Bearer " + orgBToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getNewPatternsReturnsOnlyPatternsInDeploymentWindow() throws Exception {
        String email = "deploy-test-" + UUID.randomUUID() + "@test.local";
        String orgName = "Deploy-Org-" + UUID.randomUUID();
        String adminToken = registerVerifiedAdmin(email, orgName);
        
        Long orgId = organizationRepository.findAll().stream()
                .filter(o -> o.getName().equals(orgName))
                .findFirst().orElseThrow().getId();
        Organization org = organizationRepository.findById(orgId).orElseThrow();

        long t0 = System.currentTimeMillis() - 100000;
        long t1 = System.currentTimeMillis() - 50000; // Deployment 1
        long t2 = System.currentTimeMillis() - 25000; 
        long t3 = System.currentTimeMillis() - 10000; // Deployment 2
        long t4 = System.currentTimeMillis();

        // Pattern 1: first seen before Deploy 1
        LogPattern p1 = new LogPattern();
        p1.setOrganization(org);
        p1.setPatternHash("hash1");
        p1.setTemplate("pattern 1");
        p1.setFirstSeen(new Timestamp(t0));
        p1.setLastSeen(new Timestamp(t4));
        p1.setOccurrenceCount(10);
        logPatternRepository.save(p1);

        // Pattern 2: first seen between Deploy 1 and Deploy 2
        LogPattern p2 = new LogPattern();
        p2.setOrganization(org);
        p2.setPatternHash("hash2");
        p2.setTemplate("pattern 2");
        p2.setFirstSeen(new Timestamp(t2));
        p2.setLastSeen(new Timestamp(t4));
        p2.setOccurrenceCount(5);
        logPatternRepository.save(p2);

        // Pattern 3: first seen after Deploy 2
        LogPattern p3 = new LogPattern();
        p3.setOrganization(org);
        p3.setPatternHash("hash3");
        p3.setTemplate("pattern 3");
        p3.setFirstSeen(new Timestamp(t4));
        p3.setLastSeen(new Timestamp(t4));
        p3.setOccurrenceCount(1);
        logPatternRepository.save(p3);

        // Deploy 1
        Map<String, Object> body1 = new HashMap<>();
        body1.put("version", "v1");
        body1.put("deployedAt", t1);
        MvcResult res1 = createDeployment(adminToken, body1).andExpect(status().isOk()).andReturn();
        long deploy1Id = objectMapper.readTree(res1.getResponse().getContentAsString()).get("id").asLong();

        // Deploy 2
        Map<String, Object> body2 = new HashMap<>();
        body2.put("version", "v2");
        body2.put("deployedAt", t3);
        MvcResult res2 = createDeployment(adminToken, body2).andExpect(status().isOk()).andReturn();
        long deploy2Id = objectMapper.readTree(res2.getResponse().getContentAsString()).get("id").asLong();

        // Check new patterns for Deploy 1
        MvcResult patternsRes1 = mockMvc.perform(get("/api/deployments/" + deploy1Id + "/new-patterns")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode patterns1 = objectMapper.readTree(patternsRes1.getResponse().getContentAsString());
        
        assertThat(patterns1.size()).isEqualTo(1);
        assertThat(patterns1.get(0).get("patternHash").asText()).isEqualTo("hash2");

        // Check new patterns for Deploy 2
        MvcResult patternsRes2 = mockMvc.perform(get("/api/deployments/" + deploy2Id + "/new-patterns")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn();
        JsonNode patterns2 = objectMapper.readTree(patternsRes2.getResponse().getContentAsString());
        
        assertThat(patterns2.size()).isEqualTo(1);
        assertThat(patterns2.get(0).get("patternHash").asText()).isEqualTo("hash3");
    }

    // ===== helpers =====

    private ResultActions createDeployment(String token, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/deployments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String registerVerifiedAdmin() throws Exception {
        String email = "deploy-admin-" + UUID.randomUUID() + "@test.local";
        String orgName = "Deploy-Org-" + UUID.randomUUID();
        return registerVerifiedAdmin(email, orgName);
    }

    private String registerVerifiedAdmin(String email, String orgName) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123",
                                "organizationName", orgName))))
                .andExpect(status().isOk());
        return verifyEmailAndGetToken(email);
    }

    private String registerVerifiedInvitee(String inviteCode) throws Exception {
        String email = "deploy-member-" + UUID.randomUUID() + "@test.local";
        mockMvc.perform(post("/api/auth/register-with-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "Password123", "inviteCode", inviteCode))))
                .andExpect(status().isOk());
        return verifyEmailAndGetToken(email);
    }

    private String verifyEmailAndGetToken(String email) throws Exception {
        String code = FakeMailConfig.lastCodeSentTo(email);
        assertThat(code).isNotNull();
        MvcResult result = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
}
