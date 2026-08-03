package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.AlertRuleRequest;
import org.example.logmetricapi.dto.AlertRuleResponse;
import org.example.logmetricapi.model.AlertRule;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.AlertRuleRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/alert-rules")
@PreAuthorize("hasAuthority('ADMIN')")
public class AlertRuleController {

    private final AlertRuleRepository alertRuleRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public AlertRuleController(AlertRuleRepository alertRuleRepository,
                                 OrganizationRepository organizationRepository,
                                 UserRepository userRepository) {
        this.alertRuleRepository = alertRuleRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<AlertRuleResponse> createRule(@Valid @RequestBody AlertRuleRequest request) {
        Long orgId = requireOrgId();
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        AlertRule rule = new AlertRule();
        rule.setOrganization(org);
        applyRequest(rule, request, orgId);
        rule.setCreatedAt(Timestamp.from(Instant.now()));
        alertRuleRepository.save(rule);

        return ResponseEntity.ok(toResponse(rule));
    }

    @GetMapping
    public ResponseEntity<List<AlertRuleResponse>> listRules() {
        Long orgId = requireOrgId();
        List<AlertRuleResponse> rules = alertRuleRepository.findByOrganizationId(orgId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rules);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertRuleResponse> updateRule(@PathVariable Long id, @Valid @RequestBody AlertRuleRequest request) {
        Long orgId = requireOrgId();
        AlertRule rule = alertRuleRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert rule not found"));

        applyRequest(rule, request, orgId);
        alertRuleRepository.save(rule);

        return ResponseEntity.ok(toResponse(rule));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        Long orgId = requireOrgId();
        AlertRule rule = alertRuleRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert rule not found"));
        alertRuleRepository.delete(rule);
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(AlertRule rule, AlertRuleRequest request, Long orgId) {
        rule.setName(request.getName());
        rule.setMetric(request.getMetric());
        rule.setThreshold(request.getThreshold());
        rule.setWindowSeconds(request.getWindowSeconds());
        rule.setTargetEmails(validateRecipients(request.getTargetEmails(), orgId));
        rule.setEnabled(request.isEnabled());
    }

    /**
     * Recipients must belong to the rule's own organization -- otherwise this
     * endpoint is an open relay that lets an admin exfiltrate alert content
     * (which can include log excerpts) to any address they name. Unknown
     * addresses are rejected by name, not silently dropped, so an admin who
     * thinks someone is on the list finds out now, not during an incident.
     */
    private Set<String> validateRecipients(Set<String> requested, Long orgId) {
        if (requested == null || requested.isEmpty()) {
            return new HashSet<>();
        }
        Set<String> orgEmails = userRepository.findByOrganizationId(orgId).stream()
                .map(User::getEmail)
                .collect(Collectors.toSet());

        Set<String> unknown = requested.stream()
                .filter(email -> !orgEmails.contains(email))
                .collect(Collectors.toSet());

        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Not members of this organization: " + String.join(", ", unknown));
        }

        return new HashSet<>(requested);
    }

    private Long requireOrgId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return AuthUtils.requireOrganizationId(authentication);
    }

    private AlertRuleResponse toResponse(AlertRule rule) {
        return new AlertRuleResponse(
                rule.getId(),
                rule.getName(),
                rule.getMetric().name(),
                rule.getThreshold(),
                rule.getWindowSeconds(),
                rule.getTargetEmails(),
                rule.isEnabled(),
                rule.getOrganization().getId(),
                rule.getCreatedAt().toInstant().toString()
        );
    }
}
