package org.example.logmetricapi.controller;

import jakarta.validation.Valid;
import org.example.logmetricapi.dto.AuthResponse;
import org.example.logmetricapi.dto.ChangePasswordRequest;
import org.example.logmetricapi.dto.CurrentUserResponse;
import org.example.logmetricapi.dto.ForgotPasswordRequest;
import org.example.logmetricapi.dto.LoginRequest;
import org.example.logmetricapi.dto.MessageResponse;
import org.example.logmetricapi.dto.RegisterRequest;
import org.example.logmetricapi.dto.RegisterWithInviteRequest;
import org.example.logmetricapi.dto.ResendVerificationRequest;
import org.example.logmetricapi.dto.ResetPasswordRequest;
import org.example.logmetricapi.dto.VerificationPendingResponse;
import org.example.logmetricapi.dto.VerifyEmailRequest;
import org.example.logmetricapi.model.Organization;
import org.example.logmetricapi.model.OtpPurpose;
import org.example.logmetricapi.model.Role;
import org.example.logmetricapi.model.User;
import org.example.logmetricapi.repository.OrganizationRepository;
import org.example.logmetricapi.repository.UserRepository;
import org.example.logmetricapi.service.InviteService;
import org.example.logmetricapi.service.JwtService;
import org.example.logmetricapi.service.MailService;
import org.example.logmetricapi.service.OtpService;
import org.example.logmetricapi.util.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final OtpService otpService;
    private final MailService mailService;

    public AuthController(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            InviteService inviteService,
            OtpService otpService,
            MailService mailService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.inviteService = inviteService;
        this.otpService = otpService;
        this.mailService = mailService;
    }

    @PostMapping("/register")
    public ResponseEntity<VerificationPendingResponse> register(@Valid @RequestBody RegisterRequest request) {
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

        return ResponseEntity.ok(issueVerificationCode(user));
    }

    @PostMapping("/register-with-invite")
    @Transactional
    public ResponseEntity<VerificationPendingResponse> registerWithInvite(@Valid @RequestBody RegisterWithInviteRequest request) {
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

        return ResponseEntity.ok(issueVerificationCode(user));
    }

    private VerificationPendingResponse issueVerificationCode(User user) {
        String code = otpService.issue(user.getEmail(), OtpPurpose.EMAIL_VERIFICATION);
        mailService.sendVerificationCode(user.getEmail(), code);
        return new VerificationPendingResponse(user.getEmail(), "Check your email for a verification code");
    }

    /**
     * Confirms the signup OTP and returns the same token/response shape
     * register() used to return directly, before T37 gated login on
     * verification.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        otpService.verify(request.getEmail(), OtpPurpose.EMAIL_VERIFICATION, request.getCode());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code"));
        user.setEmailVerified(true);
        userRepository.save(user);

        String jwtToken = jwtService.generateToken(user);
        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                user.getOrganization().getId()
        ));
    }

    /**
     * Always returns the same generic body, whether or not the address has a
     * pending signup -- this endpoint is unauthenticated, so branching on
     * account state would let it be used to enumerate registered emails.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        try {
            userRepository.findByEmail(request.getEmail())
                    .filter(u -> !u.isEmailVerified())
                    .ifPresent(u -> {
                        String code = otpService.issue(u.getEmail(), OtpPurpose.EMAIL_VERIFICATION);
                        mailService.sendVerificationCode(u.getEmail(), code);
                    });
        } catch (ResponseStatusException e) {
            // Resend cooldown or similar -- swallow it so this endpoint can't
            // be used to tell a real pending signup apart from a nonexistent one.
        }
        return ResponseEntity.ok(new MessageResponse("If that email has a pending verification, a new code has been sent."));
    }

    /**
     * Always returns the same generic body, whether or not the address is
     * registered -- unlike resend-verification, the caller here hasn't proven
     * they own the address at all (no valid session, no prior signup step),
     * so this is deliberately stricter about not leaking account existence.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            userRepository.findByEmail(request.getEmail())
                    .ifPresent(u -> {
                        String code = otpService.issue(u.getEmail(), OtpPurpose.PASSWORD_RESET);
                        mailService.sendPasswordResetCode(u.getEmail(), code);
                    });
        } catch (ResponseStatusException e) {
            // Resend cooldown or similar -- swallow it, same reasoning as resend-verification.
        }
        return ResponseEntity.ok(new MessageResponse("If that email is registered, a reset code has been sent."));
    }

    /**
     * otpService.verify() is purpose-scoped, so a code issued here can never
     * satisfy verify-email and vice versa -- no extra check needed for that.
     * Also marks emailVerified=true: proving control of the inbox via a
     * PASSWORD_RESET code is exactly what T37's signup verification was
     * asking for, so this doubles as a self-service recovery path for any
     * account left unverified (e.g. retroactively, by the T37 migration).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        otpService.verify(request.getEmail(), OtpPurpose.PASSWORD_RESET, request.getCode());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code"));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEmailVerified(true);
        userRepository.save(user);

        String jwtToken = jwtService.generateToken(user);
        return ResponseEntity.ok(new AuthResponse(
                jwtToken,
                user.getEmail(),
                user.getRole().name(),
                user.getOrganization().getId()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (DisabledException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email not verified");
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

    /**
     * ⚠️ Same known limitation as T38's reset-password: JWTs are stateless
     * with no server-side revocation, so any session issued before this
     * change stays valid until it expires. Changing your password here does
     * not evict a session an attacker already holds.
     */
    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = AuthUtils.requireUser(authentication);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Password changed"));
    }

    /**
     * Reads the caller's own record fresh from the DB (via CustomUserDetailsService,
     * same as every other endpoint's role check) so the frontend can detect a
     * role change without waiting for the JWT to expire or the user to re-login.
     */
    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = AuthUtils.requireUser(authentication);

        return ResponseEntity.ok(new CurrentUserResponse(
                user.getEmail(),
                user.getRole().name(),
                user.getOrganization().getId(),
                user.getOrganization().getName()
        ));
    }
}
