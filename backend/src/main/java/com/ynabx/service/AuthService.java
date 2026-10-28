package com.ynabx.service;

import com.ynabx.dto.AuthResponse;
import com.ynabx.dto.LoginRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.UserProfileResponse;
import com.ynabx.entity.RefreshToken;
import com.ynabx.entity.User;
import com.ynabx.exception.DomainConflictException;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.exception.ResourceNotFoundException;
import com.ynabx.repository.RefreshTokenRepository;
import com.ynabx.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public record AuthResult(AuthResponse response, String refreshToken) {}

    @Transactional
    public AuthResult register(RegisterRequest req) {
        if (req.email() == null || !req.email().contains("@")) {
            throw new DomainValidationException("Invalid email format");
        }
        if (req.password() == null || req.password().length() < 8) {
            throw new DomainValidationException("Password must be at least 8 characters long");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new DomainConflictException("Email already registered: " + req.email());
        }

        Instant now = Instant.now();
        User user =
                User.builder()
                        .id(UUID.randomUUID())
                        .email(req.email().toLowerCase().trim())
                        .passwordHash(passwordEncoder.encode(req.password()))
                        .displayName(req.display_name())
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        userRepository.save(user);

        return createAuthResult(user);
    }

    @Transactional
    public AuthResult login(LoginRequest req) {
        User user =
                userRepository
                        .findByEmail(req.email().toLowerCase().trim())
                        .orElseThrow(
                                () -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return createAuthResult(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException("Missing refresh token");
        }
        String hash = tokenService.hashToken(rawRefreshToken);
        RefreshToken entity =
                refreshTokenRepository
                        .findByTokenHash(hash)
                        .orElseThrow(
                                () ->
                                        new BadCredentialsException(
                                                "Invalid or revoked refresh token"));

        if (entity.isRevoked() || entity.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token is expired or revoked");
        }

        entity.setRevoked(true);
        refreshTokenRepository.save(entity);

        User user =
                userRepository
                        .findById(entity.getUserId())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return createAuthResult(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hash = tokenService.hashToken(rawRefreshToken);
            refreshTokenRepository
                    .findByTokenHash(hash)
                    .ifPresent(
                            entity -> {
                                entity.setRevoked(true);
                                refreshTokenRepository.save(entity);
                            });
        }
    }

    public UserProfileResponse getProfile(UUID userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new UserProfileResponse(
                user.getId(), user.getEmail(), user.getDisplayName(), user.getCreatedAt());
    }

    private AuthResult createAuthResult(User user) {
        String accessToken = tokenService.generateAccessToken(user.getId(), user.getEmail());
        String rawRefreshToken = tokenService.generateRefreshToken();

        Instant now = Instant.now();
        RefreshToken refreshTokenEntity =
                RefreshToken.builder()
                        .id(UUID.randomUUID())
                        .userId(user.getId())
                        .tokenHash(tokenService.hashToken(rawRefreshToken))
                        .expiresAt(now.plus(30, ChronoUnit.DAYS))
                        .revoked(false)
                        .createdAt(now)
                        .build();
        refreshTokenRepository.save(refreshTokenEntity);

        UserProfileResponse profile =
                new UserProfileResponse(
                        user.getId(), user.getEmail(), user.getDisplayName(), user.getCreatedAt());

        AuthResponse authResponse = new AuthResponse(accessToken, "Bearer", 900, profile);

        return new AuthResult(authResponse, rawRefreshToken);
    }
}
