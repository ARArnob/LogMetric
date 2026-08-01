package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.UpdateRoleRequest;
import org.example.logmetricapi.dto.UserResponse;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<UserResponse>> listUsers() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);

        List<UserResponse> users = userRepository.findByOrganizationId(orgId).stream()
                .map(u -> new UserResponse(u.getId(), u.getEmail(), u.getRole().name()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long orgId = AuthUtils.requireOrganizationId(authentication);
        User caller = AuthUtils.requireUser(authentication);

        // 404, not 403 -- don't reveal whether a user id exists in another org
        User targetUser = userRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (targetUser.getId().equals(caller.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change your own role -- ask another admin");
        }

        if (targetUser.getRole() == Role.ADMIN && request.getRole() == Role.USER) {
            long remainingAdmins = userRepository.countByOrganizationIdAndRole(orgId, Role.ADMIN);
            if (remainingAdmins <= 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot demote the organization's last remaining admin");
            }
        }

        targetUser.setRole(request.getRole());
        userRepository.save(targetUser);

        return ResponseEntity.ok(new UserResponse(targetUser.getId(), targetUser.getEmail(), targetUser.getRole().name()));
    }
}
