package com.ynabx.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.LoginRequest;
import com.ynabx.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegrationIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired private MockMvc mockMvc;

    @Autowired private ObjectMapper objectMapper;

    @Test
    void completeAuthFlowRegisterLoginRefreshLogoutAndMe() throws Exception {
        String email = "alex." + System.currentTimeMillis() + "@example.com";
        String password = "CorrectHorseBatteryStaple1!";

        RegisterRequest regReq = new RegisterRequest(email, password, "Alex Nguyen");
        MvcResult regResult =
                mockMvc.perform(
                                post("/auth/register")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(regReq)))
                        .andExpect(status().isCreated())
                        .andExpect(cookie().exists("refresh_token"))
                        .andExpect(jsonPath("$.access_token").isString())
                        .andExpect(jsonPath("$.user.email").value(email))
                        .andReturn();

        Cookie refreshCookie = regResult.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie).isNotNull();

        mockMvc.perform(
                        post("/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", "application/problem+json"))
                .andExpect(jsonPath("$.title").value("Conflict"));

        LoginRequest loginReq = new LoginRequest(email, password);
        MvcResult loginResult =
                mockMvc.perform(
                                post("/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(loginReq)))
                        .andExpect(status().isOk())
                        .andExpect(cookie().exists("refresh_token"))
                        .andExpect(jsonPath("$.access_token").isString())
                        .andReturn();

        String accessToken =
                objectMapper
                        .readTree(loginResult.getResponse().getContentAsString())
                        .get("access_token")
                        .asText();
        Cookie loginRefreshCookie = loginResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.display_name").value("Alex Nguyen"));

        MvcResult refreshResult =
                mockMvc.perform(post("/auth/refresh").cookie(loginRefreshCookie))
                        .andExpect(status().isOk())
                        .andExpect(cookie().exists("refresh_token"))
                        .andExpect(jsonPath("$.access_token").isString())
                        .andReturn();

        Cookie rotatedRefreshCookie = refreshResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/auth/refresh").cookie(loginRefreshCookie))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/logout").cookie(rotatedRefreshCookie))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }
}
