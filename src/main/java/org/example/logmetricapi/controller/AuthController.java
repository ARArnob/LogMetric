package org.example.logmetricapi.controller;

import org.example.logmetricapi.dto.AuthResponse;
import org.example.logmetricapi.dto.LoginRequest;
import org.example.logmetricapi.dto.RegisterRequest;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthController(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        // Fetch existing Organization or create a new one
        Organization org = organizationRepository.findByName(request.getOrganizationName())
                .orElseGet(() -> {
                    Organization newOrg = new Organization();
                    newOrg.setName(request.getOrganizationName());
                    return organizationRepository.save(newOrg);
                });

        // Save new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER); // Default role
        user.setOrganization(org);
        userRepository.save(user);

        // Generate JWT token
        String jwtToken = jwtService.generateToken(user);

        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                org.getId()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        // Authenticate user credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Retrieve user and generate token
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        String jwtToken = jwtService.generateToken(user);

        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                user.getOrganization().getId()
        ));
    }
}