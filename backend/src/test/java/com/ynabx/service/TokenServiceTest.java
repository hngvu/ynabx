package com.ynabx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

class TokenServiceTest {

    private JwtEncoder jwtEncoder;
    private TokenService tokenService;

    @BeforeEach
    void setUp() {
        jwtEncoder = mock(JwtEncoder.class);
        tokenService = new TokenService(jwtEncoder);
    }

    @Test
    @DisplayName("generateAccessToken: encodes JWT with user claims")
    void testGenerateAccessToken() {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        Jwt jwt =
                new Jwt(
                        "mock.jwt.token",
                        Instant.now(),
                        Instant.now().plusSeconds(900),
                        java.util.Map.of("alg", "none"),
                        java.util.Map.of("sub", userId.toString(), "email", email));
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(jwt);

        String token = tokenService.generateAccessToken(userId, email);

        assertThat(token).isEqualTo("mock.jwt.token");
    }

    @Test
    @DisplayName("generateRefreshToken: returns non-empty url-safe base64 string")
    void testGenerateRefreshToken() {
        String token1 = tokenService.generateRefreshToken();
        String token2 = tokenService.generateRefreshToken();

        assertThat(token1).isNotBlank();
        assertThat(token2).isNotBlank();
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    @DisplayName("hashToken: returns deterministic sha-256 base64 hash")
    void testHashToken() {
        String token = "sample-refresh-token-12345";
        String hash1 = tokenService.hashToken(token);
        String hash2 = tokenService.hashToken(token);

        assertThat(hash1).isNotBlank();
        assertThat(hash1).isEqualTo(hash2);
        assertThat(hash1).isNotEqualTo(token);
    }
}
