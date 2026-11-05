package com.ynabx.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.CreateAccountRequest;
import com.ynabx.dto.CreateCategoryGroupRequest;
import com.ynabx.dto.CreateCategoryRequest;
import com.ynabx.dto.CreatePlanRequest;
import com.ynabx.dto.RegisterRequest;
import com.ynabx.dto.SaveScheduledTransactionRequest;
import com.ynabx.dto.SkipOccurrenceRequest;
import com.ynabx.entity.Account.AccountType;
import com.ynabx.util.RecurrenceCalculator.Frequency;
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
class ScheduledTransactionIT {

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
                        "Sched Test User");

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
                new CreatePlanRequest("Plan Sched", "USD", "#,##0.00", true, true, "YYYY-MM-DD");
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
    @DisplayName(
            "End-to-end Scheduled Transactions: create, skip, materialize idempotency, deleted tx persistence, tenant isolation")
    void testScheduledTransactionsEndToEnd() throws Exception {
        UserSession user1 = setupUserWithPlan("u1_sch");
        UserSession user2 = setupUserWithPlan("u2_sch");

        // 1. Account & Category
        CreateAccountRequest checkingReq =
                new CreateAccountRequest(
                        "Checking", AccountType.CHECKING, true, 500_000L, null, null);
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

        CreateCategoryGroupRequest grpReq = new CreateCategoryGroupRequest("Bills", 0);
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

        CreateCategoryRequest catReq = new CreateCategoryRequest(groupId, "Rent", null, 0);
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

        // 2. Create Monthly Scheduled Transaction: due today (2026-11-05), monthly
        LocalDate today = LocalDate.of(2026, 11, 5);
        SaveScheduledTransactionRequest schedReq =
                new SaveScheduledTransactionRequest(
                        checkingId,
                        catId,
                        null,
                        "Landlord",
                        today,
                        Frequency.MONTHLY,
                        -120_000L,
                        "Monthly rent",
                        null);

        MvcResult schedRes =
                mockMvc.perform(
                                post("/plans/" + user1.planId() + "/scheduled-transactions")
                                        .header("Authorization", "Bearer " + user1.token())
                                        .header("X-Timezone", "UTC")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(schedReq)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.date_first").value("2026-11-05"))
                        .andExpect(jsonPath("$.date_next").value("2026-11-05"))
                        .andExpect(jsonPath("$.frequency").value("MONTHLY"))
                        .andExpect(jsonPath("$.amount_milliunits").value(-120000))
                        .andReturn();

        UUID schedId =
                UUID.fromString(
                        objectMapper
                                .readTree(schedRes.getResponse().getContentAsString())
                                .get("id")
                                .asText());

        // 3. Materialize: Occurrence today should be materialized into the register
        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/scheduled-transactions/materialize")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialized_count").value(1))
                .andExpect(jsonPath("$.skipped_count").value(0))
                .andExpect(jsonPath("$.has_more").value(false));

        // Verify transaction created in the ledger with approved = false, uncleared (checking), and
        // balance updated
        // Notice data[0] is starting balance, data[1] is the new scheduled occurrence (or find by
        // memo "Monthly rent")
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/transactions")
                                .header("Authorization", "Bearer " + user1.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[?(@.memo == 'Monthly rent')].approved").value(false))
                .andExpect(
                        jsonPath("$.data[?(@.memo == 'Monthly rent')].cleared").value("UNCLEARED"))
                .andExpect(
                        jsonPath("$.data[?(@.memo == 'Monthly rent')].amount_milliunits")
                                .value(-120000))
                .andExpect(
                        jsonPath("$.data[?(@.memo == 'Monthly rent')].scheduled_transaction_id")
                                .value(schedId.toString()))
                .andExpect(
                        jsonPath("$.data[?(@.memo == 'Monthly rent')].scheduled_occurrence_date")
                                .value("2026-11-05"));

        MvcResult txPageRes =
                mockMvc.perform(
                                get("/plans/" + user1.planId() + "/transactions")
                                        .header("Authorization", "Bearer " + user1.token()))
                        .andReturn();

        JsonNode dataArray =
                objectMapper.readTree(txPageRes.getResponse().getContentAsString()).get("data");
        UUID createdTxId = null;
        for (JsonNode item : dataArray) {
            if ("Monthly rent".equals(item.get("memo").asText())) {
                createdTxId = UUID.fromString(item.get("id").asText());
                break;
            }
        }
        org.junit.jupiter.api.Assertions.assertNotNull(createdTxId);

        // Check account balance updated: 500_000 - 120_000 = 380_000
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/accounts/" + checkingId)
                                .header("Authorization", "Bearer " + user1.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance_milliunits").value(380000));

        // 4. Idempotency: Calling materialize again must NOT create duplicate transactions
        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/scheduled-transactions/materialize")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialized_count").value(0))
                .andExpect(jsonPath("$.skipped_count").value(0));

        // Verify scheduled tx date_next advanced to next month (2026-12-05)
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/scheduled-transactions/" + schedId)
                                .header("Authorization", "Bearer " + user1.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date_next").value("2026-12-05"))
                .andExpect(jsonPath("$.occurrence_index").value(1));

        // 5. Test Skip occurrence: Skip 2026-12-05 -> advances to 2027-01-05
        SkipOccurrenceRequest skipReq = new SkipOccurrenceRequest(LocalDate.of(2026, 12, 5));
        mockMvc.perform(
                        post("/plans/"
                                        + user1.planId()
                                        + "/scheduled-transactions/"
                                        + schedId
                                        + "/skip")
                                .header("Authorization", "Bearer " + user1.token())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(skipReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date_next").value("2027-01-05"))
                .andExpect(jsonPath("$.occurrence_index").value(2));

        // Skip mismatch returns 409 Conflict
        SkipOccurrenceRequest wrongSkip = new SkipOccurrenceRequest(LocalDate.of(2026, 12, 5));
        mockMvc.perform(
                        post("/plans/"
                                        + user1.planId()
                                        + "/scheduled-transactions/"
                                        + schedId
                                        + "/skip")
                                .header("Authorization", "Bearer " + user1.token())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(wrongSkip)))
                .andExpect(status().isConflict());

        // 6. Test Upcoming: projects occurrences
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/scheduled-transactions/upcoming")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC")
                                .param("until", "2027-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3)) // Jan 5, Feb 5, Mar 5
                .andExpect(jsonPath("$[0].date").value("2027-01-05"))
                .andExpect(jsonPath("$[1].date").value("2027-02-05"))
                .andExpect(jsonPath("$[2].date").value("2027-03-05"));

        // 7. Deleted transaction from schedule: if user deletes created transaction, it should NOT
        // be recreated
        mockMvc.perform(
                        delete("/plans/" + user1.planId() + "/transactions/" + createdTxId)
                                .header("Authorization", "Bearer " + user1.token()))
                .andExpect(status().isNoContent());

        // Call materialize again
        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/scheduled-transactions/materialize")
                                .header("Authorization", "Bearer " + user1.token())
                                .header("X-Timezone", "UTC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialized_count").value(0));

        // 8. Tenant Isolation: User 2 cannot access or mutate User 1's schedule
        mockMvc.perform(
                        get("/plans/" + user1.planId() + "/scheduled-transactions")
                                .header("Authorization", "Bearer " + user2.token()))
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        post("/plans/" + user1.planId() + "/scheduled-transactions/materialize")
                                .header("Authorization", "Bearer " + user2.token()))
                .andExpect(status().isNotFound());
    }
}
