package com.ynabx.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ynabx.dto.MaterializeResultResponse;
import com.ynabx.dto.SaveScheduledTransactionRequest;
import com.ynabx.dto.ScheduledTransactionResponse;
import com.ynabx.dto.SkipOccurrenceRequest;
import com.ynabx.dto.UpcomingOccurrenceResponse;
import com.ynabx.service.ScheduledTransactionMaterializer;
import com.ynabx.service.ScheduledTransactionService;
import com.ynabx.util.RecurrenceCalculator.Frequency;
import com.ynabx.util.TimezoneResolver;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ScheduledTransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ScheduledTransactionControllerTest.TestClockConfig.class)
class ScheduledTransactionControllerTest {

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-11-05T00:00:00Z"), ZoneOffset.UTC);
        }

        @Bean
        TimezoneResolver timezoneResolver(Clock clock) {
            return new TimezoneResolver(clock);
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private ScheduledTransactionService scheduledTransactionService;
    @MockitoBean private ScheduledTransactionMaterializer materializer;

    private Principal principal;
    private UUID userId;
    private UUID planId;
    private UUID schedId;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        principal = () -> userId.toString();
        planId = UUID.randomUUID();
        schedId = UUID.randomUUID();
        accountId = UUID.randomUUID();
    }

    @Test
    @DisplayName("GET /plans/{planId}/scheduled-transactions lists items")
    void listScheduledTransactions() throws Exception {
        ScheduledTransactionResponse item =
                new ScheduledTransactionResponse(
                        schedId,
                        planId,
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 5),
                        LocalDate.of(2026, 11, 5),
                        Frequency.MONTHLY,
                        -100000L,
                        "Monthly subscription",
                        null,
                        0);

        when(scheduledTransactionService.listScheduledTransactions(eq(planId), eq(userId)))
                .thenReturn(List.of(item));

        mockMvc.perform(get("/plans/" + planId + "/scheduled-transactions").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(schedId.toString()))
                .andExpect(jsonPath("$[0].frequency").value("MONTHLY"));
    }

    @Test
    @DisplayName("POST /plans/{planId}/scheduled-transactions creates item")
    void createScheduledTransaction() throws Exception {
        SaveScheduledTransactionRequest req =
                new SaveScheduledTransactionRequest(
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 10),
                        Frequency.MONTHLY,
                        -50000L,
                        "Internet bill",
                        null);

        ScheduledTransactionResponse res =
                new ScheduledTransactionResponse(
                        schedId,
                        planId,
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 10),
                        LocalDate.of(2026, 11, 10),
                        Frequency.MONTHLY,
                        -50000L,
                        "Internet bill",
                        null,
                        0);

        when(scheduledTransactionService.createScheduledTransaction(
                        eq(planId),
                        eq(userId),
                        any(SaveScheduledTransactionRequest.class),
                        any(LocalDate.class)))
                .thenReturn(res);

        mockMvc.perform(
                        post("/plans/" + planId + "/scheduled-transactions")
                                .principal(principal)
                                .header("X-Timezone", "UTC")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(schedId.toString()))
                .andExpect(jsonPath("$.frequency").value("MONTHLY"));
    }

    @Test
    @DisplayName("PUT /plans/{planId}/scheduled-transactions/{id} updates item")
    void updateScheduledTransaction() throws Exception {
        SaveScheduledTransactionRequest req =
                new SaveScheduledTransactionRequest(
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 12),
                        Frequency.MONTHLY,
                        -55000L,
                        "Internet bill updated",
                        null);

        ScheduledTransactionResponse res =
                new ScheduledTransactionResponse(
                        schedId,
                        planId,
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 12),
                        LocalDate.of(2026, 11, 12),
                        Frequency.MONTHLY,
                        -55000L,
                        "Internet bill updated",
                        null,
                        0);

        when(scheduledTransactionService.updateScheduledTransaction(
                        eq(planId),
                        eq(schedId),
                        eq(userId),
                        any(SaveScheduledTransactionRequest.class),
                        any(LocalDate.class)))
                .thenReturn(res);

        mockMvc.perform(
                        put("/plans/" + planId + "/scheduled-transactions/" + schedId)
                                .principal(principal)
                                .header("X-Timezone", "Asia/Ho_Chi_Minh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(schedId.toString()))
                .andExpect(jsonPath("$.amount_milliunits").value(-55000));
    }

    @Test
    @DisplayName("DELETE /plans/{planId}/scheduled-transactions/{id} deletes item")
    void deleteScheduledTransaction() throws Exception {
        mockMvc.perform(
                        delete("/plans/" + planId + "/scheduled-transactions/" + schedId)
                                .principal(principal))
                .andExpect(status().isNoContent());

        verify(scheduledTransactionService).deleteScheduledTransaction(planId, schedId, userId);
    }

    @Test
    @DisplayName("POST /plans/{planId}/scheduled-transactions/{id}/skip skips occurrence")
    void skipOccurrence() throws Exception {
        SkipOccurrenceRequest req = new SkipOccurrenceRequest(LocalDate.of(2026, 11, 10));
        ScheduledTransactionResponse res =
                new ScheduledTransactionResponse(
                        schedId,
                        planId,
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 10),
                        LocalDate.of(2026, 12, 10),
                        Frequency.MONTHLY,
                        -50000L,
                        "Internet bill",
                        null,
                        1);

        when(scheduledTransactionService.skipOccurrence(
                        eq(planId), eq(schedId), eq(userId), any(SkipOccurrenceRequest.class)))
                .thenReturn(res);

        mockMvc.perform(
                        post("/plans/" + planId + "/scheduled-transactions/" + schedId + "/skip")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date_next").value("2026-12-10"));
    }

    @Test
    @DisplayName("GET /plans/{planId}/scheduled-transactions/upcoming returns expanded occurrences")
    void getUpcoming() throws Exception {
        UpcomingOccurrenceResponse occ =
                new UpcomingOccurrenceResponse(
                        schedId,
                        accountId,
                        null,
                        null,
                        null,
                        LocalDate.of(2026, 11, 15),
                        -25000L,
                        "Music sub",
                        Frequency.MONTHLY,
                        null);

        when(scheduledTransactionService.listUpcoming(eq(planId), eq(userId), any(), any()))
                .thenReturn(List.of(occ));

        mockMvc.perform(
                        get("/plans/" + planId + "/scheduled-transactions/upcoming")
                                .principal(principal)
                                .param("until", "2026-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].date").value("2026-11-15"));
    }

    @Test
    @DisplayName("POST /plans/{planId}/scheduled-transactions/materialize triggers materialization")
    void materialize() throws Exception {
        MaterializeResultResponse res = new MaterializeResultResponse(2, 0, false);
        when(materializer.materializeDue(eq(planId), eq(userId), any())).thenReturn(res);

        mockMvc.perform(
                        post("/plans/" + planId + "/scheduled-transactions/materialize")
                                .principal(principal)
                                .header("X-Timezone", "UTC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialized_count").value(2))
                .andExpect(jsonPath("$.skipped_count").value(0))
                .andExpect(jsonPath("$.has_more").value(false));
    }
}
