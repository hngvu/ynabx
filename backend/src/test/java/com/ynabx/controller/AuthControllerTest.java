package com.ynabx.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.AuthResponse;
import com.ynabx.dto.LoginRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.UserProfileResponse;
import com.ynabx.service.AuthService;
import jakarta.servlet.http.Cookie;
import java.security.Principal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private AuthService authService;

    @Test
    @DisplayName("POST /auth/register returns 201 Created and sets refresh cookie")
    void testRegisterSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        RegisterRequest req = new RegisterRequest("user@example.com", "Password123!", "Alice");
        AuthResponse resp = new AuthResponse("access.token.jwt", 900L, userId, "user@example.com", "Alice");
        AuthService.AuthResult result = new AuthService.AuthResult(resp, "refresh-token-val");

        when(authService.register(any(RegisterRequest.class))).thenReturn(result);

        mockMvc.perform(
                        post("/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.access_token").value("access.token.jwt"))
                .andExpect(jsonPath("$.email").value("user@example.com"));
    }

    @Test
    @DisplayName("POST /auth/login returns 200 OK and sets refresh cookie")
    void testLoginSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        LoginRequest req = new LoginRequest("user@example.com", "Password123!");
        AuthResponse resp = new AuthResponse("access.token.jwt", 900L, userId, "user@example.com", "Alice");
        AuthService.AuthResult result = new AuthService.AuthResult(resp, "refresh-token-val");

        when(authService.login(any(LoginRequest.class))).thenReturn(result);

        mockMvc.perform(
                        post("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.access_token").value("access.token.jwt"));
    }

    @Test
    @DisplayName("POST /auth/refresh returns 200 OK with new access token")
    void testRefreshSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        AuthResponse resp = new AuthResponse("new.access.token", 900L, userId, "user@example.com", "Alice");
        AuthService.AuthResult result = new AuthService.AuthResult(resp, "new-refresh-token");

        when(authService.refresh("my-old-refresh-token")).thenReturn(result);

        mockMvc.perform(
                        post("/auth/refresh")
                                .cookie(new Cookie("refresh_token", "my-old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").value("new.access.token"));
    }

    @Test
    @DisplayName("POST /auth/logout returns 204 No Content and clears cookie")
    void testLogoutSuccess() throws Exception {
        mockMvc.perform(
                        post("/auth/logout")
                                .cookie(new Cookie("refresh_token", "my-refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));

        verify(authService).logout("my-refresh-token");
    }

    @Test
    @DisplayName("GET /auth/me returns 200 OK with UserProfileResponse")
    void testMeSuccess() throws Exception {
        UUID userId = UUID.randomUUID();
        UserProfileResponse profile = new UserProfileResponse(userId, "alice@example.com", "Alice", true);
        when(authService.getProfile(userId)).thenReturn(profile);

        Principal principal = () -> userId.toString();

        mockMvc.perform(get("/auth/me").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.name").value("Alice"));
    }
}
