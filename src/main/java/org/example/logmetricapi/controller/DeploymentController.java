package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.DeploymentRequest;
import org.example.logmetricapi.dto.DeploymentResponse;
import org.example.logmetricapi.dto.LogPatternResponse;
import org.example.logmetricapi.model.AuditAction;
import org.example.logmetricapi.model.AuditLog;
import org.example.logmetricapi.model.Deployment;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.SystemEntity;
import org.example.logmetricapi.repository.AuditLogRepository;
import org.example.logmetricapi.repository.DeploymentRepository;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.SystemRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deployments")
public class DeploymentController {

    private final DeploymentRepository deploymentRepository;
    private final OrganizationRepository organizationRepository;
    private final SystemRepository systemRepository;
    private final AuditLogRepository auditLogRepository;
    private final LogPatternRepository logPatternRepository;

    public DeploymentController(DeploymentRepository deploymentRepository,
                                OrganizationRepository organizationRepository,
                                SystemRepository systemRepository,
                                AuditLogRepository auditLogRepository,
                                LogPatternRepository logPatternRepository) {
        this.deploymentRepository = deploymentRepository;
        this.organizationRepository = organizationRepository;
        this.systemRepository = systemRepository;
        this.auditLogRepository = auditLogRepository;
        this.logPatternRepository = logPatternRepository;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<DeploymentResponse> createDeployment(
            Authentication authentication,
            @Valid @RequestBody DeploymentRequest request) {

        Long orgId = AuthUtils.requireOrganizationId(authentication);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        SystemEntity system = null;
        if (request.getSystemId() != null) {
            system = systemRepository.findByIdAndOrganizationId(request.getSystemId(), orgId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found or does not belong to your organization"));
        }

        Deployment deployment = new Deployment();
        deployment.setOrganization(org);
        deployment.setSystem(system);
        deployment.setVersion(request.getVersion());
        deployment.setNotes(request.getNotes());
        
        Timestamp now = new Timestamp(System.currentTimeMillis());
        deployment.setDeployedAt(request.getDeployedAt() != null ? new Timestamp(request.getDeployedAt()) : now);
        deployment.setCreatedAt(now);

        deploymentRepository.save(deployment);

        AuditLog auditLog = new AuditLog();
        auditLog.setOrganizationId(orgId);
        auditLog.setActorEmail(authentication.getName());
        auditLog.setAction(AuditAction.DEPLOYMENT_RECORDED);
        auditLog.setDetail("Recorded deployment for version " + request.getVersion());
        auditLog.setCreatedAt(now);
        auditLogRepository.save(auditLog);

        return ResponseEntity.ok(new DeploymentResponse(
                deployment.getId(),
                deployment.getSystem() != null ? deployment.getSystem().getId() : null,
                deployment.getVersion(),
                deployment.getNotes(),
                deployment.getDeployedAt().getTime()
        ));
    }

    @GetMapping
    public ResponseEntity<List<DeploymentResponse>> getDeployments(
            Authentication authentication,
            @RequestParam(required = false) Long from,
            @RequestParam(required = false) Long to) {

        Long orgId = AuthUtils.requireOrganizationId(authentication);
        
        Timestamp fromDate = from != null ? new Timestamp(from) : null;
        Timestamp toDate = to != null ? new Timestamp(to) : null;

        List<Deployment> deployments = deploymentRepository.findByOrganizationIdAndDateRange(orgId, fromDate, toDate);

        List<DeploymentResponse> response = deployments.stream()
                .map(d -> new DeploymentResponse(
                        d.getId(),
                        d.getSystem() != null ? d.getSystem().getId() : null,
                        d.getVersion(),
                        d.getNotes(),
                        d.getDeployedAt().getTime()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/new-patterns")
    public ResponseEntity<List<LogPatternResponse>> getNewPatternsSinceDeployment(
            Authentication authentication,
            @PathVariable Long id) {

        Long orgId = AuthUtils.requireOrganizationId(authentication);
        Deployment deployment = deploymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found"));

        if (!deployment.getOrganization().getId().equals(orgId)) {
            // Cross-org deployment lookup returns 404 (as per plan specs)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found");
        }

        Timestamp deployedAt = deployment.getDeployedAt();
        
        // Find next deployment in the org (if any)
        Deployment nextDeployment = deploymentRepository.findFirstByOrganizationIdAndDeployedAtGreaterThanOrderByDeployedAtAsc(orgId, deployedAt);
        
        Timestamp endDate = nextDeployment != null ? nextDeployment.getDeployedAt() : new Timestamp(System.currentTimeMillis());

        List<LogPattern> patterns = logPatternRepository.findByOrganizationIdAndFirstSeenBetween(orgId, deployedAt, endDate);

        List<LogPatternResponse> response = patterns.stream()
                .map(p -> new LogPatternResponse(
                        p.getPatternHash(),
                        p.getTemplate(),
                        p.getSampleMessage(),
                        p.getFirstSeen(),
                        p.getLastSeen(),
                        p.getOccurrenceCount()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}
