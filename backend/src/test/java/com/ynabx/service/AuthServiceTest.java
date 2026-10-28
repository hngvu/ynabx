package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ynabx.dto.LoginRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.entity.RefreshToken;
import com.ynabx.entity.User;
import com.ynabx.exception.DomainConflictException;
import com.ynabx.exception.DomainValidationException;
import com.ynabx.repository.RefreshTokenRepository;
import com.ynabx.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private TokenService tokenService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService =
                new AuthService(
                        userRepository, refreshTokenRepository, passwordEncoder, tokenService);
    }

    @Test
    @DisplayName("register: throws DomainValidationException when email format is invalid")
    void registerInvalidEmail() {
        RegisterRequest req = new RegisterRequest("invalid-email", "password123", "Alex");
        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Invalid email format");
    }

    @Test
    @DisplayName("register: throws DomainValidationException when password length < 8")
    void registerShortPassword() {
        RegisterRequest req = new RegisterRequest("alex@example.com", "short", "Alex");
        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("at least 8 characters");
    }

    @Test
    @DisplayName("register: throws DomainConflictException when email is already registered")
    void registerDuplicateEmail() {
        when(userRepository.existsByEmail("alex@example.com")).thenReturn(true);
        RegisterRequest req = new RegisterRequest("alex@example.com", "password123", "Alex");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    @DisplayName("register: successfully registers new user and issues tokens")
    void registerSuccess() {
        when(userRepository.existsByEmail("alex@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashedPassword");
        when(tokenService.generateAccessToken(any(), any())).thenReturn("jwt.token.here");
        when(tokenService.generateRefreshToken()).thenReturn("refreshTokenRaw");
        when(tokenService.hashToken("refreshTokenRaw")).thenReturn("hashedRefreshToken");

        RegisterRequest req = new RegisterRequest("alex@example.com", "password123", "Alex");
        AuthService.AuthResult result = authService.register(req);

        assertThat(result.response().access_token()).isEqualTo("jwt.token.here");
        assertThat(result.refreshToken()).isEqualTo("refreshTokenRaw");
        assertThat(result.response().user().email()).isEqualTo("alex@example.com");
        verify(userRepository).save(any(User.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("login: throws BadCredentialsException on unknown email")
    void loginUnknownEmail() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        LoginRequest req = new LoginRequest("unknown@example.com", "password123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("login: throws BadCredentialsException on password mismatch")
    void loginWrongPassword() {
        User user =
                User.builder()
                        .id(UUID.randomUUID())
                        .email("alex@example.com")
                        .passwordHash("hashed")
                        .build();
        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "hashed")).thenReturn(false);

        LoginRequest req = new LoginRequest("alex@example.com", "wrongpass");
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("refresh: revokes old token and issues new rotated tokens")
    void refreshRotationSuccess() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("alex@example.com").build();
        RefreshToken entity =
                RefreshToken.builder()
                        .id(UUID.randomUUID())
                        .userId(userId)
                        .tokenHash("hash123")
                        .revoked(false)
                        .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
                        .build();

        when(tokenService.hashToken("raw123")).thenReturn("hash123");
        when(refreshTokenRepository.findByTokenHash("hash123")).thenReturn(Optional.of(entity));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(tokenService.generateAccessToken(userId, "alex@example.com"))
                .thenReturn("new.access.token");
        when(tokenService.generateRefreshToken()).thenReturn("newRawRefresh");
        when(tokenService.hashToken("newRawRefresh")).thenReturn("newHashRefresh");

        AuthService.AuthResult result = authService.refresh("raw123");

        assertThat(entity.isRevoked()).isTrue();
        assertThat(result.response().access_token()).isEqualTo("new.access.token");
        assertThat(result.refreshToken()).isEqualTo("newRawRefresh");
        verify(refreshTokenRepository).save(entity);
    }

    @Test
    @DisplayName("refresh: throws BadCredentialsException on revoked or expired token")
    void refreshRevokedOrExpired() {
        RefreshToken revoked =
                RefreshToken.builder()
                        .userId(UUID.randomUUID())
                        .revoked(true)
                        .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
                        .build();
        when(tokenService.hashToken("rawRevoked")).thenReturn("hashRevoked");
        when(refreshTokenRepository.findByTokenHash("hashRevoked"))
                .thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> authService.refresh("rawRevoked"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("expired or revoked");
    }
}
