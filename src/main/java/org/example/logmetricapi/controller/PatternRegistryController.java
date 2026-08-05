package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.LogPatternResponse;
import org.example.logmetricapi.model.LogPattern;
import org.example.logmetricapi.repository.LogPatternRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patterns")
public class PatternRegistryController {

    private final LogPatternRepository logPatternRepository;

    public PatternRegistryController(LogPatternRepository logPatternRepository) {
        this.logPatternRepository = logPatternRepository;
    }

    @GetMapping
    public ResponseEntity<Page<LogPatternResponse>> getPatterns(
            Authentication authentication,
            @RequestParam(defaultValue = "volume") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Long orgId = AuthUtils.requireOrganizationId(authentication);

        Sort sortOrder = switch (sort.toLowerCase()) {
            case "recent" -> Sort.by(Sort.Direction.DESC, "lastSeen");
            case "new" -> Sort.by(Sort.Direction.DESC, "firstSeen");
            case "volume" -> Sort.by(Sort.Direction.DESC, "occurrenceCount");
            default -> Sort.by(Sort.Direction.DESC, "occurrenceCount");
        };

        Pageable pageable = PageRequest.of(page, size, sortOrder);
        Page<LogPattern> patterns = logPatternRepository.findByOrganizationId(orgId, pageable);

        Page<LogPatternResponse> response = patterns.map(p -> new LogPatternResponse(
                p.getPatternHash(),
                p.getTemplate(),
                p.getSampleMessage(),
                p.getFirstSeen(),
                p.getLastSeen(),
                p.getOccurrenceCount()
        ));

        return ResponseEntity.ok(response);
    }
}
