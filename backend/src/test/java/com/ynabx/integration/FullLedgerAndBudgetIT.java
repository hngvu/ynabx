package com.ynabx.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.AllocationUpdate;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.CreateCategoryGroupRequest;
import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.ReconcileAccountRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.SaveTransactionRequest;
import com.ynabx.dto.UpdateMonthAllocationsRequest;
import com.ynabx.entity.Account.AccountType;
import com.ynabx.entity.Transaction.ClearedStatus;
import java.time.LocalDate;
import java.util.List;
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
class FullLedgerAndBudgetIT {

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

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest regReq = new RegisterRequest(email, "Password1234!", "Test User");
        MvcResult res =
                mockMvc.perform(
                                post("/auth/register")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(regReq)))
                        .andExpect(status().isCreated())
                        .andReturn();
        return objectMapper
                .readTree(res.getResponse().getContentAsString())
                .get("access_token")
                .asText();
    }

    @Test
    @DisplayName(
            "End-to-End: Plans, Categories, Accounts, Transfers, CC Funded Spending & Rollover")
    void testCompleteBudgetLifecycle() throws Exception {
        String tokenUserA =
                registerAndGetToken("userA." + System.currentTimeMillis() + "@example.com");
        String tokenUserB =
                registerAndGetToken("userB." + System.currentTimeMillis() + "@example.com");

        CreatePlanRequest planReq =
                new CreatePlanRequest("Family Budget", "USD", "#,##0.00", true, true, "YYYY-MM-DD");
        MvcResult planRes =
                mockMvc.perform(
                                post("/plans")
                                        .header("Authorization", "Bearer " + tokenUserA)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(planReq)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.name").value("Family Budget"))
                        .andReturn();

        String planIdStr =
                objectMapper
                        .readTree(planRes.getResponse().getContentAsString())
                        .get("id")
                        .asText();
        UUID planId = UUID.fromString(planIdStr);

        mockMvc.perform(get("/plans/" + planId).header("Authorization", "Bearer " + tokenUserB))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Type", "application/problem+json"));

        CreateCategoryGroupRequest groupReq = new CreateCategoryGroupRequest("Living Expenses", 1);
        MvcResult groupRes =
                mockMvc.perform(
                                post("/plans/" + planId + "/category-groups")
                                        .header("Authorization", "Bearer " + tokenUserA)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(groupReq)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String groupIdStr =
                objectMapper
                        .readTree(groupRes.getResponse().getContentAsString())
                        .get("id")
                        .asText();
        UUID groupId = UUID.fromString(groupIdStr);

        CreateCategoryRequest catReq =
                new CreateCategoryRequest(groupId, "Groceries", "Weekly food", 1);
        MvcResult catRes =
                mockMvc.perform(
                                post("/plans/" + planId + "/categories")
                                        .header("Authorization", "Bearer " + tokenUserA)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(catReq)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String catIdStr =
                objectMapper.readTree(catRes.getResponse().getContentAsString()).get("id").asText();
        UUID groceriesCatId = UUID.fromString(catIdStr);

        CreateAccountRequest checkingReq =
                new CreateAccountRequest(
                        "Checking Account", AccountType.CHECKING, true, 3_000_000L, "Main bank", 1);
        MvcResult chkRes =
                mockMvc.perform(
                                post("/plans/" + planId + "/accounts")
                                        .header("Authorization", "Bearer " + tokenUserA)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(checkingReq)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.balance_milliunits").value(3_000_000L))
                        .andReturn();

        String checkingIdStr =
                objectMapper.readTree(chkRes.getResponse().getContentAsString()).get("id").asText();
        UUID checkingAccountId = UUID.fromString(checkingIdStr);

        CreateAccountRequest ccReq =
                new CreateAccountRequest(
                        "Chase Visa", AccountType.CREDIT_CARD, true, 0L, "Credit card", 2);
        MvcResult ccRes =
                mockMvc.perform(
                                post("/plans/" + planId + "/accounts")
                                        .header("Authorization", "Bearer " + tokenUserA)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(ccReq)))
                        .andExpect(status().isCreated())
                        .andReturn();

        String ccIdStr =
                objectMapper.readTree(ccRes.getResponse().getContentAsString()).get("id").asText();
        UUID ccAccountId = UUID.fromString(ccIdStr);

        LocalDate currentMonth = LocalDate.of(2026, 10, 1);
        mockMvc.perform(
                        get("/plans/" + planId + "/months/" + currentMonth)
                                .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready_to_assign_milliunits").value(3_000_000L));

        UpdateMonthAllocationsRequest allocReq =
                new UpdateMonthAllocationsRequest(
                        List.of(new AllocationUpdate(groceriesCatId, 500_000L)));

        mockMvc.perform(
                        patch("/plans/" + planId + "/months/" + currentMonth + "/allocations")
                                .header("Authorization", "Bearer " + tokenUserA)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(allocReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready_to_assign_milliunits").value(2_500_000L))
                .andExpect(jsonPath("$.total_assigned_milliunits").value(500_000L));

        SaveTransactionRequest ccTxReq =
                new SaveTransactionRequest(
                        ccAccountId,
                        groceriesCatId,
                        null,
                        "Trader Joe's",
                        currentMonth.plusDays(5),
                        -120_000L,
                        "Dinner items",
                        ClearedStatus.CLEARED,
                        true,
                        null);

        mockMvc.perform(
                        post("/plans/" + planId + "/transactions")
                                .header("Authorization", "Bearer " + tokenUserA)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(ccTxReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount_milliunits").value(-120_000L));

        MvcResult updatedMonthRes =
                mockMvc.perform(
                                get("/plans/" + planId + "/months/" + currentMonth)
                                        .header("Authorization", "Bearer " + tokenUserA))
                        .andExpect(status().isOk())
                        .andReturn();

        String monthJson = updatedMonthRes.getResponse().getContentAsString();
        assertThat(monthJson).contains("380000");
        assertThat(monthJson).contains("120000");

        SaveTransactionRequest transferReq =
                new SaveTransactionRequest(
                        checkingAccountId,
                        null,
                        null,
                        null,
                        currentMonth.plusDays(10),
                        -120_000L,
                        "CC Payment Transfer",
                        ClearedStatus.CLEARED,
                        true,
                        ccAccountId);

        mockMvc.perform(
                        post("/plans/" + planId + "/transactions")
                                .header("Authorization", "Bearer " + tokenUserA)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transfer_account_id").value(ccAccountId.toString()))
                .andExpect(jsonPath("$.transfer_transaction_id").isNotEmpty());

        mockMvc.perform(
                        get("/plans/" + planId + "/accounts/" + checkingAccountId)
                                .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance_milliunits").value(2_880_000L));

        mockMvc.perform(
                        get("/plans/" + planId + "/accounts/" + ccAccountId)
                                .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance_milliunits").value(0L));

        ReconcileAccountRequest recReq = new ReconcileAccountRequest(0L, false);
        mockMvc.perform(
                        post("/plans/" + planId + "/accounts/" + ccAccountId + "/reconcile")
                                .header("Authorization", "Bearer " + tokenUserA)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(recReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.last_reconciled_at").isNotEmpty());
    }
}
