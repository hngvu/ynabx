package com.ynabx.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ynabx.service.report.AgeOfMoneyReport;
import com.ynabx.service.report.AgeOfMoneyService;
import com.ynabx.service.report.SpendingBreakdown;
import com.ynabx.service.report.SpendingBreakdownService;
import com.ynabx.util.TimezoneResolver;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ReportController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private SpendingBreakdownService spendingBreakdownService;
    @MockBean private AgeOfMoneyService ageOfMoneyService;
    @MockBean private TimezoneResolver timezoneResolver;

    private final UUID planId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final java.security.Principal principal = () -> userId.toString();

    @Test
    void getSpendingBreakdownReturns200WithMilliunits() throws Exception {
        LocalDate sinceMonth = LocalDate.of(2026, 9, 1);
        LocalDate untilMonth = LocalDate.of(2026, 10, 1);
        LocalDate today = LocalDate.of(2026, 11, 5);

        when(timezoneResolver.today("Asia/Ho_Chi_Minh")).thenReturn(today);

        UUID catId = UUID.randomUUID();
        UUID grpId = UUID.randomUUID();
        SpendingBreakdown.CategoryBreakdown cat =
                new SpendingBreakdown.CategoryBreakdown(catId, "Groceries", 250_000L, 5, 10000);
        SpendingBreakdown.GroupBreakdown grp =
                new SpendingBreakdown.GroupBreakdown(grpId, "Food", 250_000L, 10000, List.of(cat));
        SpendingBreakdown.LargestOutflow lo =
                new SpendingBreakdown.LargestOutflow(
                        UUID.randomUUID(),
                        LocalDate.of(2026, 9, 15),
                        "Market",
                        catId,
                        "Groceries",
                        100_000L);

        SpendingBreakdown breakdown =
                new SpendingBreakdown(sinceMonth, untilMonth, 2, 61, 250_000L, 5, List.of(grp), lo);

        when(spendingBreakdownService.getSpendingBreakdown(
                        eq(planId), any(), eq(sinceMonth), eq(untilMonth), any(), any(), eq(today)))
                .thenReturn(breakdown);

        mockMvc.perform(
                        get("/plans/{planId}/reports/spending-breakdown", planId)
                                .principal(principal)
                                .header("X-Timezone", "Asia/Ho_Chi_Minh")
                                .param("since_month", "2026-09-01")
                                .param("until_month", "2026-10-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.since_month").value("2026-09-01"))
                .andExpect(jsonPath("$.until_month").value("2026-10-01"))
                .andExpect(jsonPath("$.total_spent_milliunits").value(250000))
                .andExpect(jsonPath("$.groups[0].group_name").value("Food"))
                .andExpect(jsonPath("$.groups[0].percentage_basis_points").value(10000))
                .andExpect(jsonPath("$.groups[0].categories[0].spent_milliunits").value(250000))
                .andExpect(jsonPath("$.largest_outflow.payee_name").value("Market"))
                .andExpect(jsonPath("$.largest_outflow.amount_milliunits").value(100000));
    }

    @Test
    void getAgeOfMoneyReturns200() throws Exception {
        LocalDate today = LocalDate.of(2026, 11, 5);
        when(timezoneResolver.today(null)).thenReturn(today);

        AgeOfMoneyReport report =
                new AgeOfMoneyReport(
                        today,
                        45,
                        List.of(
                                new AgeOfMoneyReport.DataPoint(LocalDate.of(2026, 10, 31), 40),
                                new AgeOfMoneyReport.DataPoint(today, 45)));

        when(ageOfMoneyService.getAgeOfMoney(eq(planId), any(), eq(12), eq(today)))
                .thenReturn(report);

        mockMvc.perform(get("/plans/{planId}/reports/age-of-money", planId).principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.as_of_date").value("2026-11-05"))
                .andExpect(jsonPath("$.age_of_money_days").value(45))
                .andExpect(jsonPath("$.series.length()").value(2));
    }

    @Test
    void getSpendingBreakdownRejectsInvalidTimezone() throws Exception {
        when(timezoneResolver.today("Invalid/Zone"))
                .thenThrow(
                        new com.ynabx.exception.DomainValidationException(
                                "Invalid X-Timezone header: Invalid/Zone"));

        mockMvc.perform(
                        get("/plans/{planId}/reports/spending-breakdown", planId)
                                .principal(principal)
                                .header("X-Timezone", "Invalid/Zone")
                                .param("until_month", "2026-10-01"))
                .andExpect(status().isBadRequest());
    }
}
