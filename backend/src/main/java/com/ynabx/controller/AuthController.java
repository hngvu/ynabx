package com.ynabx.controller;

import com.ynabx.dto.AuthResponse;
import com.ynabx.dto.LoginRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.UserProfileResponse;
import com.ynabx.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody RegisterRequest req, HttpServletResponse response) {
        AuthService.AuthResult result = authService.register(req);
        setRefreshTokenCookie(response, result.refreshToken(), 30 * 24 * 3600);
        return ResponseEntity.status(HttpStatus.CREATED).body(result.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest req, HttpServletResponse response) {
        AuthService.AuthResult result = authService.login(req);
        setRefreshTokenCookie(response, result.refreshToken(), 30 * 24 * 3600);
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.refresh(refreshToken);
        setRefreshTokenCookie(response, result.refreshToken(), 30 * 24 * 3600);
        return ResponseEntity.ok(result.response());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        authService.logout(refreshToken);
        setRefreshTokenCookie(response, "", 0);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    private void setRefreshTokenCookie(
            HttpServletResponse response, String token, long maxAgeSeconds) {
        ResponseCookie cookie =
                ResponseCookie.from("refresh_token", token)
                        .httpOnly(true)
                        .secure(false)
                        .sameSite("Strict")
                        .path("/api/v1/auth")
                        .maxAge(maxAgeSeconds)
                        .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
