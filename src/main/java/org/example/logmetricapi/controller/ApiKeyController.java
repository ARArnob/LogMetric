package org.example.logmetricapi.controller;

import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.service.ApiKeyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/keys")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final OrganizationRepository organizationRepository;

    public ApiKeyController(ApiKeyService apiKeyService, OrganizationRepository organizationRepository) {
        this.apiKeyService = apiKeyService;
        this.organizationRepository = organizationRepository;
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateKey() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        Long orgId = null;
        
        if (authentication != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof org.example.logmetricapi.model.User) {
                org.example.logmetricapi.model.User user = (org.example.logmetricapi.model.User) principal;
                if (user.getOrganization() != null) {
                    orgId = user.getOrganization().getId();
                }
            } else if (principal instanceof Organization) {
                orgId = ((Organization) principal).getId();
            } else if (principal instanceof Long) {
                orgId = (Long) principal;
            }
        }

        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized to generate API Key");
        }

        Optional<Organization> organizationOpt = organizationRepository.findById(orgId);
        if (organizationOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found");
        }

        String rawKey = apiKeyService.generateKey(organizationOpt.get());
        
        return ResponseEntity.ok(Map.of("apiKey", rawKey));
    }
}
