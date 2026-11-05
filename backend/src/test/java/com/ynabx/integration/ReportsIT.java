package com.ynabx.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.CreateCategoryGroupRequest;
import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.entity.Account.AccountType;
import com.ynabx.entity.Transaction.ClearedStatus;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
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
class ReportsIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private record UserSession(String token, UUID planId) {}

    private UserSession setupUserWithPlan(String emailPrefix) throws Exception {
        RegisterRequest registerReq =
                new RegisterRequest(
                        emailPrefix + "_" + UUID.randomUUID() + "@example.com",
                        "Secret123!",
                        "Report Test User");

        MvcResult regResult =
                mockMvc.perform(
                                post("/auth/register")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(registerReq)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String token =
                objectMapper
                        .readTree(regResult.getResponse().getContentAsString())
                        .get("access_token")
                        .asText();

        CreatePlanRequest planReq =
                new CreatePlanRequest(
                        "My Spending Plan", "USD", "#,##0.00", true, true, "YYYY-MM-DD");
        MvcResult planResult =
                mockMvc.perform(
                                post("/plans")
                                        .header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(planReq)))
                        .andExpect(status().isCreated())
                        .andReturn();

        UUID planId =
                UUID.fromString(
                        objectMapper
                                .readTree(planResult.getResponse().getContentAsString())
                                .get("id")
                                .asText());

        return new UserSession(token, planId);
    }

    @Test
    @DisplayName("Spending breakdown and Age of Money report integration and tenant isolation")
    void testReportsEndToEndAndTenantIsolation() throws Exception {
        UserSession user1 = setupUserWithPlan("u1_rep");
        UserSession user2 = setupUserWithPlan("u2_rep");

        // User 1 creates checking account
        CreateAccountRequest checkingReq =
                new CreateAccountRequest("Checking", AccountType.CHECKING, true, 0L, null, null);
        MvcResult checkingRes =
                mockMvc.perform(
                                post("/plans/" + user1.planId() + "/accounts")
                                        .header("Authorization", "Bearer " + user1.token())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(checkingReq)))
                        .andExpect(status().isCreated())
                        .andReturn();
        UUID checkingId =
                UUID.fromString(
                        objectMapper
                                .readTree(checkingRes.getResponse().getContentAsString())
                                .get("id")
                                .asText());

        // Category group & category
        CreateCategoryGroupRequest grpReq = new CreateCategoryGroupRequest("Everyday Expenses", 0);
        MvcResult grpRes =
                mockMvc.perform(
                                post("/plans/" + user1.planId() + "/category-groups")
                                        .header("Authorization", "Bearer " + user1.token())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(grpReq)))
                        .andExpect(status().isCreated())
                        .andReturn();
        UUID groupId =
                UUID.fromString(
                        objectMapper
                                .readTree(grpRes.getResponse().getContentAsString())
                                .get("id")
                                .asText());

        CreateCategoryRequest catReq = new CreateCategoryRequest(groupId, "Groceries", null, 0);
        MvcResult catRes =
                mockMvc.perform(
                                post("/plans/" + user1.planId() + "/categories")
                                        .header("Authorization", "Bearer " + user1.token())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(catReq)))
                        .andExpect(status().isCreated())
                        .andReturn();
        UUID catId =
                UUID.fromString(
                        objectMapper
                                .readTree(catRes.getResponse().getContentAsString())
                                .get("id")
                                .asText());

        // Inflow category for salary
        MvcResult planMonthRes =
                mockMvc.perform(
                                get("/plans/" + user1.planId() + "/months/2026-09-01")
                                        .header("Authorization", "Bearer " + user1.token()))
                        .andExpect(status().isOk())
                        .andReturn();
        String inflowCatIdStr =
                objectMapper
                        .readTree(planMonthRes.getResponse().getContentAsString())
                        .get("categories")
                        .get(0)
                        .get("category_id")
                        .asText();
        UUID inflowCatId = UUID.fromString(inflowCatIdStr);

        // 1. Inflow transaction (Salary): +1,000,000 on 2026-09-01
        SaveTransactionRequest salaryTx =
                new SaveTransactionRequest(
                        checkingId,
                        inflowCatId,
                        null,
                        "Employer",
                        LocalDate.of(2026, 9, 1),
                        1_000_000L,
                        "Salary",
                        ClearedStatus.CLEARED,
                        true,
                        null);
        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/transactions")
                                .header("Authorization", "Bearer " + user1.token())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(salaryTx)))
                .andExpect(status().isCreated());

        // 2. Outflow transaction: -300,000 on 2026-09-15
        SaveTransactionRequest groceryTx =
                new SaveTransactionRequest(
                        checkingId,
                        catId,
                        null,
                        "Supermarket",
                        LocalDate.of(2026, 9, 15),
                        -300_000L,
                        "Weekly grocery",
                        ClearedStatus.CLEARED,
                        true,
                        null);
        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/transactions")
                                .header("Authorization", "Bearer " + user1.token())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(groceryTx)))
                .andExpect(status().isCreated());

        // Test Spending Breakdown
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/reports/spending-breakdown")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC")
                                .param("since_month", "2026-09-01")
                                .param("until_month", "2026-09-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_spent_milliunits").value(300000))
                .andExpect(jsonPath("$.transaction_count").value(1))
                .andExpect(jsonPath("$.groups[0].group_name").value("Everyday Expenses"))
                .andExpect(jsonPath("$.groups[0].percentage_basis_points").value(10000))
                .andExpect(jsonPath("$.groups[0].categories[0].category_name").value("Groceries"))
                .andExpect(jsonPath("$.largest_outflow.amount_milliunits").value(300000))
                .andExpect(jsonPath("$.largest_outflow.payee_name").value("Supermarket"));

        // Test Age of Money (outflow took 300,000 from Sep 1 on Sep 15 -> age = 14 days)
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/reports/age-of-money")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC")
                                .param("months", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age_of_money_days").value(14));

        // Tenant Isolation: User 2 must NOT access User 1's reports
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/reports/spending-breakdown")
                                .header("Authorization", "Bearer " + user2.token())
                                .param("until_month", "2026-09-01"))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/reports/age-of-money")
                                .header("Authorization", "Bearer " + user2.token()))
                .andExpect(status().isNotFound());
    }
}
