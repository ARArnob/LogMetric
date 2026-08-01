package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.AuthResponse;
import org.example.logmetricapi.dto.LoginRequest;
import org.example.logmetricapi.dto.RegisterRequest;
import org.example.logmetricapi.dto.RegisterWithInviteRequest;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.service.InviteService;
import org.example.logmetricapi.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final InviteService inviteService;

    public AuthController(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            InviteService inviteService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.inviteService = inviteService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        // Open registration may not join an existing organization by name --
        // that would let anyone read that organization's logs. First user of
        // a brand-new org name becomes its ADMIN.
        if (organizationRepository.findByName(request.getOrganizationName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Organization already exists -- ask an admin for an invite");
        }

        Organization org = new Organization();
        org.setName(request.getOrganizationName());
        org.setCreatedAt(Timestamp.from(Instant.now()));
        org = organizationRepository.save(org);

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ADMIN);
        user.setOrganization(org);
        userRepository.save(user);

        String jwtToken = jwtService.generateToken(user);

        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                org.getId()
        ));
    }

    @PostMapping("/register-with-invite")
    @Transactional
    public ResponseEntity<AuthResponse> registerWithInvite(@Valid @RequestBody RegisterWithInviteRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        // redeem() is called after the email check, and before any User save,
        // so a failed registration never burns a valid invite code.
        Organization org = inviteService.redeem(request.getInviteCode());

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setOrganization(org);
        userRepository.save(user);

        String jwtToken = jwtService.generateToken(user);

        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                org.getId()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        String jwtToken = jwtService.generateToken(user);

        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                user.getOrganization().getId()
        ));
    }
}
